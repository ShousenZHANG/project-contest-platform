package com.w16a.danish.common.domain.vo;

import com.baomidou.mybatisplus.core.metadata.IPage;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Unified paginated response wrapper used across all services.
 *
 * <p>Use the {@link #of(IPage, List)} or {@link #map(IPage, Function)} factory
 * methods instead of the builder to eliminate boilerplate in service implementations.
 *
 * <pre>{@code
 *   // Before (scattered boilerplate):
 *   PageResponse.builder()
 *       .data(voList).total(page.getTotal()).page(page.getCurrent())
 *       .size(page.getSize()).pages(page.getPages()).build();
 *
 *   // After (deep factory):
 *   PageResponse.map(page, CompetitionResponseVO::from);
 * }</pre>
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

    @Schema(description = "Current page number (1-based)")
    private long page;

    @Schema(description = "Number of items per page")
    private long size;

    @Schema(description = "Total number of pages available")
    private long pages;

    // ── Navigation helpers ────────────────────────────────────────────────────

    @Schema(description = "Whether a next page exists")
    public boolean isHasNext() { return page < pages; }

    @Schema(description = "Whether a previous page exists")
    public boolean isHasPrevious() { return page > 1; }

    @Schema(description = "Whether this is the first page")
    public boolean isFirstPage() { return page == 1; }

    @Schema(description = "Whether this is the last page")
    public boolean isLastPage() { return page >= pages; }

    // ── Static factories ──────────────────────────────────────────────────────

    /**
     * Build a {@code PageResponse<T>} from a MyBatis-Plus {@link IPage} result
     * and a pre-mapped data list.
     *
     * @param page  the IPage result from a mapper query
     * @param data  already-mapped VO list (same order as page.getRecords())
     */
    public static <T> PageResponse<T> of(IPage<?> page, List<T> data) {
        return PageResponse.<T>builder()
                .data(data)
                .total(page.getTotal())
                .page(page.getCurrent())
                .size(page.getSize())
                .pages(page.getPages())
                .build();
    }

    /**
     * Build a {@code PageResponse<R>} from a MyBatis-Plus {@link IPage} by
     * applying a mapping function to each record.
     *
     * @param page   the IPage result (entity list)
     * @param mapper function converting each entity to a VO
     */
    public static <E, R> PageResponse<R> map(IPage<E> page, Function<E, R> mapper) {
        List<R> data = page.getRecords().stream()
                .map(mapper)
                .collect(Collectors.toList());
        return of(page, data);
    }
}
