package com.w16a.danish.common.domain.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Unified paginated response wrapper used across all services.
 *
 * @author Eddy ZHANG
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Schema(name = "PageResponse", description = "Paginated response object")
public class PageResponse<T> {

    @Schema(description = "List of items in the current page")
    private List<T> data;

    @Schema(description = "Total number of items available")
    private long total;

    @Schema(description = "Current page number")
    private long page;

    @Schema(description = "Number of items per page")
    private long size;

    @Schema(description = "Total number of pages available")
    private long pages;
}
