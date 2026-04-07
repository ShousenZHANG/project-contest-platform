package com.w16a.danish.user.service.impl;

import com.w16a.danish.user.domain.po.TeamMembers;
import com.w16a.danish.user.mapper.TeamMembersMapper;
import com.w16a.danish.user.service.ITeamMembersService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

/**
 * <p>
 * Mapping table between users and teams
 * </p>
 *
 * @author Eddy
 * @since 2025-04-16
 */
@Slf4j
@Service
public class TeamMembersServiceImpl extends ServiceImpl<TeamMembersMapper, TeamMembers> implements ITeamMembersService {

}
