package com.w16a.danish.user.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.bean.copier.CopyOptions;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.RegexPool;
import cn.hutool.core.util.ReUtil;
import cn.hutool.core.util.StrUtil;
import com.w16a.danish.common.context.RequestContext;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.w16a.danish.user.config.FrontendProperties;
import com.w16a.danish.user.config.GithubOAuthProperties;
import com.w16a.danish.user.config.GoogleOAuthProperties;
import com.w16a.danish.user.config.JwtConfig;
import com.w16a.danish.user.domain.dto.*;
import com.w16a.danish.user.domain.po.Roles;
import com.w16a.danish.user.domain.po.UserRoles;
import com.w16a.danish.user.domain.po.Users;
import com.w16a.danish.common.domain.vo.PageResponse;
import com.w16a.danish.common.domain.vo.UserBriefVO;
import com.w16a.danish.user.domain.vo.*;
import com.w16a.danish.common.exception.BusinessException;
import com.w16a.danish.user.feign.*;
import com.w16a.danish.user.mapper.UsersMapper;
import com.w16a.danish.user.profile.AvatarFiles;
import com.w16a.danish.user.service.IRolesService;
import com.w16a.danish.user.service.IUserRolesService;
import com.w16a.danish.user.service.IUsersService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.w16a.danish.user.util.JwtUtil;
import com.w16a.danish.user.util.PasswordUtil;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.messaging.MessagingException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;


/**
 * @author Eddy ZHANG
 * @date 2025/03/16
 * @description UsersServiceImpl
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsersServiceImpl extends ServiceImpl<UsersMapper, Users> implements IUsersService {

    private final IRolesService rolesService;
    private final IUserRolesService userRolesService;
    private final JwtConfig jwtConfig;
    private final PasswordUtil passwordUtil;
    private final GithubOAuthProperties githubOAuthProperties;
    private final GoogleOAuthProperties googleOAuthProperties;
    private final GithubOAuthClient githubOAuthClient;
    private final GithubUserClient githubUserClient;
    private final GoogleOAuthClient googleOAuthClient;
    private final GoogleUserClient googleUserClient;
    private final RedisTemplate<String, String> redisTemplate;
    private final FrontendProperties frontendProperties;
    private final AvatarFiles avatarFiles;
    private final JwtUtil jwtUtil;
    private final JavaMailSender mailSender;


    private static final long RESET_LINK_EXPIRATION_MINUTES = 15;


    @Override
    @Transactional
    public UserResponseVO register(RegisterRequestDTO registerDTO) {
        if (registerDTO.getRole() == null || !List.of("PARTICIPANT", "ORGANIZER").contains(registerDTO.getRole())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid role: " + registerDTO.getRole()
                    + ". Public registration only permits PARTICIPANT or ORGANIZER");
        }
        Account account = createAccount(registerDTO);
        Users user = account.user();
        Roles role = account.role();
        String token = jwtUtil.generateAndStoreToken(createClaims(user.getId(), role.getName()), jwtConfig.getSecret(), jwtConfig.getExpiration());
        return new UserResponseVO(user.getId(), user.getName(), user.getEmail(), role.getName(), token, jwtConfig.getExpiration() / 1000);
    }

    @Override
    @Transactional
    public UserBriefVO provisionAccount(RequestContext administrator, RegisterRequestDTO registerDTO) {
        administrator.requireAnyRole("ADMIN");
        if (registerDTO.getRole() == null || !List.of("ADMIN", "JUDGE").contains(registerDTO.getRole())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Admin provisioning only permits ADMIN or JUDGE");
        }
        Account account = createAccount(registerDTO);
        return UserBriefVO.builder().id(account.user().getId()).name(account.user().getName())
                .email(account.user().getEmail()).role(account.role().getName()).build();
    }

    private Account createAccount(RegisterRequestDTO registerDTO) {
        String email = registerDTO.getEmail();
        String password = registerDTO.getPassword();
        String roleName = registerDTO.getRole();

        log.info("Registration attempt: email={}, role={}", email, roleName);

        if (!ReUtil.isMatch(RegexPool.EMAIL, email)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid email format");
        }

        boolean exists = lambdaQuery().eq(Users::getEmail, email).exists();
        if (exists) {
            log.warn("Registration rejected - email already registered: {}", email);
            throw new BusinessException(HttpStatus.CONFLICT, "Email already registered");
        }

        if (!passwordUtil.isPasswordValid(password)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters, include a number and an uppercase letter");
        }

        Roles role = rolesService.lambdaQuery().eq(Roles::getName, roleName).one();
        if (role == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleName);
        }

        // create user object
        Users user = BeanUtil.copyProperties(registerDTO, Users.class);
        user.setId(StrUtil.uuid());
        user.setPassword(passwordUtil.encryptPassword(password));
        this.save(user);

        // assign role
        UserRoles userRole = new UserRoles();
        userRole.setUserId(user.getId());
        userRole.setRoleId(role.getId());
        userRolesService.save(userRole);

        return new Account(user, role);
    }

    private record Account(Users user, Roles role) {}

    @Override
    @Transactional
    public UserResponseVO login(LoginRequestDTO loginDTO) {
        // find user by email
        Users user = getOne(
                new LambdaQueryWrapper<Users>()
                        .eq(Users::getEmail, loginDTO.getEmail())
        );

        if (user == null || !passwordUtil.verifyPassword(loginDTO.getPassword(), user.getPassword())) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // get user role
        UserRoles userRole = userRolesService.getOne(
                new LambdaQueryWrapper<UserRoles>()
                        .eq(UserRoles::getUserId, user.getId())
        );

        if (userRole == null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "No permission to perform this action");
        }

        // get role
        Roles role = rolesService.getById(userRole.getRoleId());

        if (role == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "User role is invalid or missing");
        }

        String inputRole = loginDTO.getRole().trim().toUpperCase();
        String dbRole = role.getName().trim().toUpperCase();

        if (!inputRole.equals(dbRole)) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Selected role does not match your account role. Please choose the correct role.");
        }

        String token = jwtUtil.generateAndStoreToken(createClaims(user.getId(), role.getName()), jwtConfig.getSecret(), jwtConfig.getExpiration());
        log.info("Login successful: userId={}, role={}", user.getId(), role.getName());
        return new UserResponseVO(user.getId(), user.getName(), user.getEmail(), role.getName(), token, jwtConfig.getExpiration() / 1000);
    }

    @Override
    @Transactional
    public String deleteUserById(String userId, RequestContext ctx) {
        // check if user has permission to delete
        // only ADMIN can delete other users
        boolean isSelf = ctx.userId().equals(userId);
        boolean isAdmin = ctx.isAdmin();
        if (!isSelf && !isAdmin) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "You do not have permission to delete this user");
        }

        // Serialize administrator deletion and block new FK references while deciding.
        baseMapper.lockAdministratorRole();
        if (baseMapper.lockAccount(userId) == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        }
        // The first consistent read must follow both locks (MySQL REPEATABLE READ).
        Users user = getById(userId);
        if (user == null) throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        if (baseMapper.isLastAdministrator(userId)) {
            throw new BusinessException(HttpStatus.CONFLICT, "The last administrator cannot be deleted");
        }
        if (baseMapper.hasRetainedHistory(userId)) {
            throw new BusinessException(HttpStatus.CONFLICT,
                    "This account has competition or team history and cannot be deleted");
        }

        // Revoke first: a failed Redis write must not leave a deleted account authorized.
        redisTemplate.delete("jwt:token:" + userId);

        // delete user roles
        userRolesService.remove(new LambdaQueryWrapper<UserRoles>().eq(UserRoles::getUserId, userId));

        boolean userRemoved = removeById(userId);
        if (!userRemoved) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to delete user");
        }
        avatarFiles.deleteAfterCommit(user.getAvatarUrl());
        return "User deleted successfully";
    }

    @Override
    public UserProfileVO getUserProfile(String userId) {
        // Retrieve user by ID
        Users user = getById(userId);
        if (user == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        }

        return BeanUtil.copyProperties(user, UserProfileVO.class);
    }

    @Override
    @Transactional
    public UserResponseVO oauthLoginOrRegister(OAuthLoginRequestDTO oAuthLoginRequestDTO) {
        String provider = oAuthLoginRequestDTO.getProvider().toLowerCase();
        String email, name, subject;

        if ("google".equals(provider)) {
            MultiValueMap<String, String> tokenBody = new LinkedMultiValueMap<>();
            tokenBody.add("client_id", googleOAuthProperties.getClientId());
            tokenBody.add("client_secret", googleOAuthProperties.getClientSecret());
            tokenBody.add("code", oAuthLoginRequestDTO.getCode());
            tokenBody.add("grant_type", "authorization_code");
            tokenBody.add("redirect_uri", googleOAuthProperties.getRedirectUri());

            Map<String, Object> tokenResponse = googleOAuthClient.getAccessToken(tokenBody);
            String accessToken = (String) tokenResponse.get("access_token");

            if (accessToken == null) {
                throw new BusinessException(HttpStatus.UNAUTHORIZED, "Failed to get Google access token");
            }

            GoogleUserDTO googleUser = googleUserClient.getUserInfo("Bearer " + accessToken);
            if (googleUser == null || !Boolean.TRUE.equals(googleUser.getEmailVerified()) || googleUser.getEmail() == null) {
                throw new BusinessException(HttpStatus.UNAUTHORIZED, "Failed to get Google user info");
            }

            email = googleUser.getEmail();
            name = googleUser.getName();
            subject = googleUser.getSub();

        } else if ("github".equals(provider)) {
            Map<String, String> body = new HashMap<>();
            body.put("client_id", githubOAuthProperties.getClientId());
            body.put("client_secret", githubOAuthProperties.getClientSecret());
            body.put("code", oAuthLoginRequestDTO.getCode());
            body.put("redirect_uri", githubOAuthProperties.getRedirectUri());

            Map<String, Object> tokenResponse = githubOAuthClient.getAccessToken(body);
            String accessToken = (String) tokenResponse.get("access_token");

            if (accessToken == null) {
                throw new BusinessException(HttpStatus.UNAUTHORIZED, "Failed to retrieve access token from GitHub");
            }

            GithubUserDTO githubUser = githubUserClient.getUserInfo("Bearer " + accessToken);
            if (githubUser == null || githubUser.getLogin() == null) {
                throw new BusinessException(HttpStatus.UNAUTHORIZED, "Failed to retrieve GitHub user info");
            }

            List<GithubEmailDTO> providerEmails = githubUserClient.getEmails("Bearer " + accessToken);
            email = Optional.ofNullable(providerEmails).orElse(List.of()).stream()
                    .filter(e -> e != null && e.isPrimary() && e.isVerified() && StringUtils.hasText(e.getEmail()))
                    .map(GithubEmailDTO::getEmail).findFirst()
                    .orElseThrow(() -> new BusinessException(HttpStatus.UNAUTHORIZED, "GitHub requires a verified primary email"));
            name = githubUser.getLogin();
            subject = githubUser.getId() == null ? null : githubUser.getId().toString();
        } else {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Unsupported provider: " + provider);
        }

        String roleName = StringUtils.hasText(oAuthLoginRequestDTO.getRole()) ? oAuthLoginRequestDTO.getRole().toUpperCase() : "PARTICIPANT";
        if (!List.of("PARTICIPANT", "ORGANIZER").contains(roleName)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleName);
        }

        if (!StringUtils.hasText(subject) || subject.length() > 255) {
            throw new BusinessException(HttpStatus.UNAUTHORIZED, "Provider returned no stable account identity");
        }
        String linkedUserId = baseMapper.findOAuthUser(provider, subject);
        Users user = linkedUserId == null ? null : this.getById(linkedUserId);
        Roles role;

        if (user == null) {
            if (!ReUtil.isMatch(RegexPool.EMAIL, email)) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid email format returned from " + provider);
            }

            boolean emailExists = this.lambdaQuery().eq(Users::getEmail, email).exists();
            if (emailExists) {
                throw new BusinessException(HttpStatus.CONFLICT, "This email has an existing account. Use password sign-in or reset your password; OAuth is not linked");
            }

            user = new Users();
            user.setId(StrUtil.uuid());
            user.setEmail(email);
            user.setName(name);
            user.setPassword(passwordUtil.encryptPassword(StrUtil.uuid()));
            this.save(user);

            role = rolesService.lambdaQuery().eq(Roles::getName, roleName).one();
            if (role == null) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Role not found: " + roleName);
            }

            UserRoles userRole = new UserRoles();
            userRole.setUserId(user.getId());
            userRole.setRoleId(role.getId());
            userRolesService.save(userRole);
            if (baseMapper.bindOAuthAccount(provider, subject, user.getId()) != 1) {
                throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to link provider identity");
            }
        } else {
            UserRoles userRole = userRolesService.getOne(
                    new LambdaQueryWrapper<UserRoles>().eq(UserRoles::getUserId, user.getId()));
            if (userRole == null) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "User has no role");
            }
            role = rolesService.getById(userRole.getRoleId());
            if (role == null || !List.of("PARTICIPANT", "ORGANIZER").contains(role.getName().toUpperCase(Locale.ROOT))) {
                throw new BusinessException(HttpStatus.FORBIDDEN, "Privileged accounts require password sign-in");
            }
        }

        String token = jwtUtil.generateAndStoreToken(createClaims(user.getId(), role.getName()), jwtConfig.getSecret(), jwtConfig.getExpiration());
        return new UserResponseVO(user.getId(), user.getName(), user.getEmail(), role.getName(), token, jwtConfig.getExpiration() / 1000);
    }

    @Override
    @Transactional
    public UserResponseVO resetPassword(ResetPasswordRequest request) {
        String redisKey = "reset:token:" + request.getToken();
        String userId = redisTemplate.opsForValue().get(redisKey);

        if (userId == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Reset link is invalid or expired");
        }

        String newPassword = request.getNewPassword();
        if (!passwordUtil.isPasswordValid(newPassword)) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters, contain a number and an uppercase letter");
        }
        if (baseMapper.lockAccount(userId) == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Reset link is invalid or expired");
        }
        Users user = this.getById(userId);
        if (user == null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Reset link is invalid or expired");
        }
        if (passwordUtil.verifyPassword(newPassword, user.getPassword())) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "New password must be different from the old one");
        }

        // get user role and create token
        UserRoles userRole = userRolesService.getOne(
                new LambdaQueryWrapper<UserRoles>().eq(UserRoles::getUserId, user.getId())
        );
        if (userRole == null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "User has no role");
        }

        Roles role = rolesService.getById(userRole.getRoleId());
        if (role == null) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "User has no role");
        }
        // Two requests may have validated the same token; Redis atomically selects one winner.
        if (!Objects.equals(userId, redisTemplate.opsForValue().getAndDelete(redisKey))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Reset link is invalid or expired");
        }
        user.setPassword(passwordUtil.encryptPassword(newPassword));
        user.setUpdatedAt(null);
        if (!this.updateById(user)) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to reset password");
        }
        String token = jwtUtil.generateAndStoreToken(createClaims(user.getId(), role.getName()), jwtConfig.getSecret(), jwtConfig.getExpiration());
        return new UserResponseVO(user.getId(), user.getName(), user.getEmail(), role.getName(), token, jwtConfig.getExpiration() / 1000);
    }

    @Override
    @Transactional
    public void sendResetLink(String email) {
        // find user by email
        Users user = this.lambdaQuery().eq(Users::getEmail, email).one();
        if (user == null) {
            // Do not reveal whether an account exists for this email (anti-enumeration).
            // Respond identically to the success path; simply skip sending the reset email.
            log.info("Password reset requested for a non-existent email; ignoring silently");
            return;
        }

        // create reset token and save to Redis
        String token = StrUtil.uuid();
        String redisKey = "reset:token:" + token;
        redisTemplate.opsForValue().set(redisKey, user.getId(), RESET_LINK_EXPIRATION_MINUTES, TimeUnit.MINUTES);

        // send HTML email
        sendResetPasswordHtmlEmail(email, token);
    }

    @Override
    public void logout(String token) {
        jwtUtil.blacklistToken(token, jwtConfig.getExpiration());
    }

    @Override
    @Transactional
    public UserProfileVO updateUserProfile(String userId, UpdateUserDTO updateUserDTO) {
        if (updateUserDTO.getAvatarUrl() != null) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Upload avatar through the avatar endpoint");
        }
        if (baseMapper.lockAccount(userId) == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        }
        // check if user exists
        Users user = this.getById(userId);
        if (user == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        }

        String newEmail = updateUserDTO.getEmail();
        if (StrUtil.isNotBlank(newEmail) && !StrUtil.equals(user.getEmail(), newEmail)) {
            if (!ReUtil.isMatch(RegexPool.EMAIL, newEmail)) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Invalid email format");
            }

            boolean exists = lambdaQuery().eq(Users::getEmail, newEmail).exists();
            if (exists) {
                throw new BusinessException(HttpStatus.CONFLICT, "Email is already in use");
            }

            user.setEmail(newEmail);
        }

        String newPassword = updateUserDTO.getPassword();
        if (StrUtil.isNotBlank(newPassword)) {
            if (!passwordUtil.isPasswordValid(newPassword)) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters long and contain at least one uppercase letter and one number");
            }

            if (passwordUtil.verifyPassword(newPassword, user.getPassword())) {
                throw new BusinessException(HttpStatus.BAD_REQUEST, "New password must be different from the old one");
            }

            user.setPassword(passwordUtil.encryptPassword(newPassword));
        }

        BeanUtil.copyProperties(updateUserDTO, user,
                CopyOptions.create()
                        .ignoreNullValue()
                        .setIgnoreProperties("email", "password"));

        if (StrUtil.isNotBlank(newPassword)) redisTemplate.delete("jwt:token:" + userId);

        user.setUpdatedAt(null);
        if (!this.updateById(user)) {
            throw new BusinessException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to update user profile");
        }

        return BeanUtil.copyProperties(user, UserProfileVO.class);
    }

    @Override
    public List<UserBriefVO> getUsersByIds(List<String> userIds, String role) {
        requireBoundedLookup(userIds);
        if (CollUtil.isEmpty(userIds)) {
            return Collections.emptyList();
        }

        List<Users> users = this.lambdaQuery()
                .in(Users::getId, userIds)
                .list();

        Map<String, String> userIdToRoleMap = trustedRoles(users);
        if (StrUtil.isNotBlank(role)) {
            users = users.stream()
                    .filter(u -> role.equalsIgnoreCase(userIdToRoleMap.get(u.getId())))
                    .toList();
        }

        return users.stream()
                .map(user -> UserBriefVO.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .avatarUrl(user.getAvatarUrl())
                        .description(user.getDescription())
                        .createdAt(user.getCreatedAt())
                        .role(userIdToRoleMap.getOrDefault(user.getId(), "UNKNOWN"))
                        .build())
                .toList();
    }

    @Override
    public UserBriefVO getUserBriefById(String userId) {
        Users user = this.getById(userId);
        if (user == null) {
            throw new BusinessException(HttpStatus.NOT_FOUND, "User not found");
        }

        return UserBriefVO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .description(user.getDescription())
                .createdAt(user.getCreatedAt())
                .role(trustedRoles(List.of(user)).getOrDefault(user.getId(), "UNKNOWN"))
                .build();
    }

    @Override
    public List<UserBriefVO> getUsersByEmails(List<String> emails) {
        requireBoundedLookup(emails);
        if (emails == null || emails.isEmpty()) {
            return List.of();
        }

        List<Users> users = this.lambdaQuery()
                .in(Users::getEmail, emails)
                .list();
        Map<String, String> userIdToRoleMap = trustedRoles(users);

        return users.stream()
                .map(user -> {
                    UserBriefVO vo = new UserBriefVO();
                    vo.setId(user.getId());
                    vo.setName(user.getName());
                    vo.setEmail(user.getEmail());
                    vo.setAvatarUrl(user.getAvatarUrl());
                    vo.setDescription(user.getDescription());
                    vo.setCreatedAt(user.getCreatedAt());
                    vo.setRole(userIdToRoleMap.getOrDefault(user.getId(), "UNKNOWN"));
                    return vo;
                })
                .collect(Collectors.toList());
    }

    private Map<String, String> trustedRoles(List<Users> users) {
        if (users.isEmpty()) return Map.of();
        return userRolesService.list(new LambdaQueryWrapper<UserRoles>()
                        .in(UserRoles::getUserId, users.stream().map(Users::getId).toList()))
                .stream().collect(Collectors.toMap(UserRoles::getUserId,
                        userRole -> Optional.ofNullable(rolesService.getById(userRole.getRoleId()))
                                .map(Roles::getName).orElse("UNKNOWN"), (existing, replacement) -> existing));
    }

    private static void requireBoundedLookup(List<String> values) {
        if (values != null && (values.size() > 100 || values.stream().anyMatch(v -> !StringUtils.hasText(v) || v.length() > 254))) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Lookups accept at most 100 non-empty values");
        }
    }

    @Override
    public PageResponse<AdminUserVO> listUsersAdmin(RequestContext ctx, String role, String keyword, int page, int size, String sortBy, String order) {
        if (!ctx.isAdmin()) {
            throw new BusinessException(HttpStatus.FORBIDDEN, "Only ADMINs can access this resource.");
        }
        if (page < 1 || size < 1 || size > 100) {
            throw new BusinessException(HttpStatus.BAD_REQUEST, "Page must be positive and size must be between 1 and 100");
        }

        // Step 1: resolve user IDs matching the role filter (DB-level pre-filter)
        List<String> filteredUserIds = null;
        if (StrUtil.isNotBlank(role)) {
            Roles targetRole = rolesService.lambdaQuery().eq(Roles::getName, role.toUpperCase()).one();
            if (targetRole == null) {
                return new PageResponse<>(Collections.emptyList(), 0, page, size, 0);
            }
            filteredUserIds = userRolesService.lambdaQuery()
                    .eq(UserRoles::getRoleId, targetRole.getId())
                    .list()
                    .stream().map(UserRoles::getUserId).toList();
            if (filteredUserIds.isEmpty()) {
                return new PageResponse<>(Collections.emptyList(), 0, page, size, 0);
            }
        }

        // Step 2: DB-level query with keyword and role filters + pagination
        boolean isAsc = !"desc".equalsIgnoreCase(order);
        LambdaQueryWrapper<Users> wrapper = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(keyword)) {
            wrapper.and(w -> w.like(Users::getName, keyword).or().like(Users::getEmail, keyword));
        }
        if (filteredUserIds != null) {
            wrapper.in(Users::getId, filteredUserIds);
        }
        switch (sortBy == null ? "createdAt" : sortBy) {
            case "name" -> wrapper.orderBy(true, isAsc, Users::getName);
            case "email" -> wrapper.orderBy(true, isAsc, Users::getEmail);
            default -> wrapper.orderBy(true, isAsc, Users::getCreatedAt);
        }

        IPage<Users> usersPage = this.page(new Page<>(page, size), wrapper);

        if (usersPage.getRecords().isEmpty()) {
            return new PageResponse<>(Collections.emptyList(), usersPage.getTotal(), page, size, usersPage.getPages());
        }

        // Step 3: batch-load roles for only the paged user IDs
        List<String> pageUserIds = usersPage.getRecords().stream().map(Users::getId).toList();
        Map<String, String> userIdToRoleMap = userRolesService.lambdaQuery()
                .in(UserRoles::getUserId, pageUserIds)
                .list()
                .stream()
                .collect(Collectors.toMap(
                        UserRoles::getUserId,
                        ur -> Optional.ofNullable(rolesService.getById(ur.getRoleId()))
                                .map(Roles::getName)
                                .orElse("UNKNOWN"),
                        (existing, replacement) -> existing
                ));

        List<AdminUserVO> pagedList = usersPage.getRecords().stream()
                .map(user -> AdminUserVO.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .avatarUrl(user.getAvatarUrl())
                        .description(user.getDescription())
                        .createdAt(user.getCreatedAt())
                        .role(userIdToRoleMap.getOrDefault(user.getId(), "UNKNOWN"))
                        .build())
                .toList();

        return new PageResponse<>(pagedList, (int) usersPage.getTotal(), page, size, (int) usersPage.getPages());
    }



    private void sendResetPasswordHtmlEmail(String email, String token) {
        try {
            String resetUrl = frontendProperties.buildResetPasswordUrl(token);
            String subject = "[Contest Platform] Password Reset Request";

            String content = String.format("""
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
              <p>Hello,</p>

              <p>We received a request to reset your password.</p>

              <p>
                Click the link below to set a new password (valid for <b>%d minutes</b>):<br>
                👉 <a href="%s" style="color:#1a73e8;text-decoration:none;">Click here to reset your password</a>
              </p>

              <p>If you did not request this, please ignore this email.</p>

              <br>
              <p>Regards,<br><b>Danish Competition Platform</b></p>
            </div>
            """, RESET_LINK_EXPIRATION_MINUTES, resetUrl);

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(content, true);

            mailSender.send(message);
        } catch (MessagingException | jakarta.mail.MessagingException e) {
            throw new RuntimeException("Failed to send reset password email", e);
        }
    }

    private Map<String, Object> createClaims(String userId, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("role", role);
        claims.put("exp", (System.currentTimeMillis() + jwtConfig.getExpiration()) / 1000);
        return claims;
    }

}
