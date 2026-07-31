package com.w16a.danish.common.domain.vo;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The navigation helpers are serialized into every paged response as {@code hasNext},
 * {@code hasPrevious}, {@code firstPage} and {@code lastPage}, and the frontend's pagination
 * controls are driven by them. The boundaries — first page, last page, and the empty result where
 * {@code pages} is 0 — are where an off-by-one would show up as a dead "Next" button.
 */
class PageResponseTest {

    @Test
    @DisplayName("of() copies the paging figures off the IPage and keeps the supplied data")
    void ofCarriesPagingFigures() {
        Page<String> page = new Page<>(2, 10, 25);
        page.setRecords(List.of("a", "b"));

        PageResponse<String> response = PageResponse.of(page, List.of("A", "B"));

        assertThat(response.getData()).containsExactly("A", "B");
        assertThat(response.getTotal()).isEqualTo(25);
        assertThat(response.getPage()).isEqualTo(2);
        assertThat(response.getSize()).isEqualTo(10);
        assertThat(response.getPages()).isEqualTo(3);
    }

    @Test
    @DisplayName("map() applies the mapper in record order, so rows keep their alignment")
    void mapPreservesRecordOrder() {
        Page<String> page = new Page<>(1, 10, 3);
        page.setRecords(List.of("alice", "bob", "carol"));

        PageResponse<Integer> response = PageResponse.map(page, String::length);

        assertThat(response.getData()).containsExactly(5, 3, 5);
        assertThat(response.getTotal()).isEqualTo(3);
    }

    @Test
    @DisplayName("The middle of a run has a page on both sides")
    void middlePageNavigatesBothWays() {
        PageResponse<String> middle = pageOf(2, 3);

        assertThat(middle.isHasPrevious()).isTrue();
        assertThat(middle.isHasNext()).isTrue();
        assertThat(middle.isFirstPage()).isFalse();
        assertThat(middle.isLastPage()).isFalse();
    }

    @Test
    @DisplayName("The first page offers no previous, and the last offers no next")
    void endsOfTheRunAreClosed() {
        PageResponse<String> first = pageOf(1, 3);
        assertThat(first.isFirstPage()).isTrue();
        assertThat(first.isHasPrevious()).isFalse();
        assertThat(first.isHasNext()).isTrue();

        PageResponse<String> last = pageOf(3, 3);
        assertThat(last.isLastPage()).isTrue();
        assertThat(last.isHasNext()).isFalse();
        assertThat(last.isHasPrevious()).isTrue();
    }

    @Test
    @DisplayName("A single page is both the first and the last, with nowhere to go")
    void singlePageIsBothEnds() {
        PageResponse<String> only = pageOf(1, 1);

        assertThat(only.isFirstPage()).isTrue();
        assertThat(only.isLastPage()).isTrue();
        assertThat(only.isHasNext()).isFalse();
        assertThat(only.isHasPrevious()).isFalse();
    }

    @Test
    @DisplayName("An empty result is the last page, so the UI does not offer a next one")
    void emptyResultHasNowhereToGo() {
        PageResponse<String> empty = pageOf(1, 0);

        assertThat(empty.isHasNext()).isFalse();
        assertThat(empty.isLastPage()).isTrue();
        assertThat(empty.isHasPrevious()).isFalse();
    }

    private static PageResponse<String> pageOf(long current, long pages) {
        return PageResponse.<String>builder().data(List.of()).page(current).pages(pages).size(10).build();
    }
}
