import React from "react";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../testUtils";
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
        data: { data: [{ id: "comp1", name: "Test Competition", status: 'ONGOING' }], page: 1, size: 10, total: 1, pages: 1 },
      });
    }
    if (url.includes("/dashboard/statistics")) {
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
    return Promise.reject(new Error("Unknown API: " + url));
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("OrganizerDashboard", () => {
  it("renders loading spinner initially", () => {
    renderWithProviders(<OrganizerDashboard />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders dashboard metrics after loading", async () => {
    renderWithProviders(<OrganizerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Participants/i)).toBeInTheDocument();
      expect(screen.getByText(/Submissions/i)).toBeInTheDocument();
      expect(screen.getByText(/Judges/i)).toBeInTheDocument();
      expect(screen.getByText(/Approval/i)).toBeInTheDocument();
    });
    expect(apiClient.get).toHaveBeenCalledWith('/dashboard/statistics', { params: { competitionId: 'comp1' } });
    expect(apiClient.get.mock.calls.some(([url]) => url === '/dashboard/public/statistics')).toBe(false);
    expect(apiClient.get).toHaveBeenCalledWith('/competitions/achieve/my', { params: { page: 1, size: 10 } });
    expect(apiClient.get.mock.calls.some(([url]) => url.startsWith('/competitions/managed/'))).toBe(false);
  });

  it("shows status distribution and trend viewer", async () => {
    renderWithProviders(<OrganizerDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Status Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/Trend Viewer/i)).toBeInTheDocument();
    });
  });

  it("can select a competition for trend viewing", async () => {
    renderWithProviders(<OrganizerDashboard />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Select competition/i)).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByLabelText(/Select competition/i));

    await waitFor(() => {
      expect(screen.getByText(/Test Competition/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Test Competition/i));
  });

  it('shows the server total and current-page statistics beyond the old 100-competition cap', async () => {
    const contests = Array.from({ length: 127 }, (_, index) => ({
      id: `contest-${index + 1}`, name: `Contest ${index + 1}`, status: 'COMPLETED',
    }));
    apiClient.get.mockImplementation((url, options) => {
      if (url === '/competitions/achieve/my') {
        const { page, size } = options.params;
        return Promise.resolve({ data: {
          data: contests.slice((page - 1) * size, page * size),
          page, size, total: contests.length, pages: Math.ceil(contests.length / size),
        } });
      }
      if (url === '/dashboard/statistics') {
        return Promise.resolve({ data: { participationType: 'INDIVIDUAL', individualParticipantCount: 1, submissionCount: 2, approvedSubmissionCount: 1, judgeCount: 3 } });
      }
      return Promise.reject(new Error(`Unexpected endpoint: ${url}`));
    });
    renderWithProviders(<OrganizerDashboard />, { route: '/OrganizerDashboard/org@example.com?page=11' });
    expect(await screen.findByText('Showing competitions 101–110 of 127 total.')).toBeInTheDocument();
    expect(await screen.findByText('Current page metrics · 10 competitions')).toBeInTheDocument();
    expect(apiClient.get.mock.calls.filter(([url]) => url === '/dashboard/statistics')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Showing competitions 111–120 of 127 total.')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/competitions/achieve/my', { params: { page: 12, size: 10 } });
    expect(apiClient.get.mock.calls.some(([url]) => url.startsWith('/competitions/managed/'))).toBe(false);
  });
});
