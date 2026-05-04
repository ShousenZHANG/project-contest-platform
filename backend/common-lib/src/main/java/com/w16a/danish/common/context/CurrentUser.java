package com.w16a.danish.common.context;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method parameter of type {@link RequestContext} for
 * automatic injection by {@link RequestContextArgumentResolver}.
 *
 * <p>Usage:
 * <pre>{@code
 *   @GetMapping("/me")
 *   public ResponseEntity<?> getProfile(@CurrentUser RequestContext ctx) {
 *       return ResponseEntity.ok(userService.getProfile(ctx.userId()));
 *   }
 * }</pre>
 *
 * @author Eddy ZHANG
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface CurrentUser {
}
