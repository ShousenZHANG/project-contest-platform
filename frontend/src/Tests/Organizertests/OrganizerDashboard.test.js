import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import OrganizerDashboard from "../../Organizer/Dashboard";
import apiClient from '../../api/apiClient';

jest.mock("../../api/apiClient");

global.ResizeObserver = class {
  observe() { }
  unobserve() { }
  disconnect() { }
};

beforeEach(() => {
  apiClient.get.mockImplementation((url) => {
    if (url.includes("/competitions/achieve/my")) {
      return Promise.resolve({
        data: { data: [{ id: "comp1", name: "Test Competition" }] },
      });
    }
    if (url.includes("/dashboard/public/statistics")) {
      return Promise.resolve({
        data: {
          submissionCount: 10,
          approvedSubmissionCount: 7,
          individualParticipantCount: 5,
          teamParticipantCount: 0,
          judgeCount: 3,
          participationType: "INDIVIDUAL",
          individualParticipantTrend: {
            "2025-01-01": 1,
            "2025-01-02": 2,
          },
        },
      });
    }
    if (url.includes("/competitions/")) {
      return Promise.resolve({
        data: { status: "open" },
      });
    }
    return Promise.reject(new Error("Unknown API: " + url));
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("OrganizerDashboard", () => {
  it("renders loading spinner initially", () => {
    render(
      <BrowserRouter>
        <OrganizerDashboard />
      </BrowserRouter>
    );
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders dashboard metrics after loading", async () => {
    render(
      <BrowserRouter>
        <OrganizerDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Participants/i)).toBeInTheDocument();
      expect(screen.getByText(/Submissions/i)).toBeInTheDocument();
      expect(screen.getByText(/Judges/i)).toBeInTheDocument();
      expect(screen.getByText(/Approval/i)).toBeInTheDocument();
    });
  });

  it("shows status distribution and trend viewer", async () => {
    render(
      <BrowserRouter>
        <OrganizerDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Status Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/Trend Viewer/i)).toBeInTheDocument();
    });
  });

  it("can select a competition for trend viewing", async () => {
    render(
      <BrowserRouter>
        <OrganizerDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Select competition/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByLabelText(/Select competition/i));

    await waitFor(() => {
      expect(screen.getByText(/Test Competition/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Test Competition/i));
  });
});
