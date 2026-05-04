package com.w16a.danish.registration.feign.fallback;

import com.w16a.danish.common.exception.ServiceUnavailableException;
import com.w16a.danish.registration.domain.vo.CompetitionResponseVO;
import com.w16a.danish.registration.feign.CompetitionServiceClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
public class CompetitionServiceClientFallback implements CompetitionServiceClient {

    @Override
    public ResponseEntity<CompetitionResponseVO> getCompetitionById(String id) {
        throw new ServiceUnavailableException("competition-service", "getCompetitionById");
    }

    @Override
    public ResponseEntity<List<CompetitionResponseVO>> getCompetitionsByIds(List<String> ids) {
        throw new ServiceUnavailableException("competition-service", "getCompetitionsByIds");
    }
}
