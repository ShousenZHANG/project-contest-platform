import React from "react";
import { render, screen } from "@testing-library/react";
import AdminDashboard from "../../Admin/AdminDashboard";
import { BrowserRouter } from "react-router-dom";
import apiClient from '../../api/apiClient';

jest.mock("../../api/apiClient");

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeAll(() => {
  Storage.prototype.getItem = jest.fn((key) => {
    if (key === "email") return "admin@example.com";
    if (key === "token") return "admin-token";
    if (key === "userId") return "admin-id";
    if (key === "role") return "admin";
    return null;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("AdminDashboard", () => {
  it("renders and shows loading initially", async () => {
    apiClient.get.mockResolvedValue({
      data: {
        totalCompetitions: 10,
        activeCompetitions: 3,
        finishedCompetitions: 5,
        totalParticipants: 100,
        individualParticipants: 60,
        teamParticipants: 40,
        totalSubmissions: 80,
        individualSubmissions: 50,
        teamSubmissions: 30,
        approvedSubmissions: 70,
        submissionTrend: { "2025-04-01": 10, "2025-04-02": 20 },
        participantTrend: {
          individual: { "2025-04-01": 5, "2025-04-02": 10 },
          team: { "2025-04-01": 2, "2025-04-02": 3 },
        },
      },
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Platform Dashboard/i)).toBeInTheDocument();
    await screen.findByText(/Competitions/i);
  });

  it("renders overview cards after fetch", async () => {
    apiClient.get.mockResolvedValue({
      data: {
        totalCompetitions: 10,
        activeCompetitions: 3,
        finishedCompetitions: 5,
        totalParticipants: 100,
        individualParticipants: 60,
        teamParticipants: 40,
        totalSubmissions: 80,
        individualSubmissions: 50,
        teamSubmissions: 30,
        approvedSubmissions: 70,
        submissionTrend: { "2025-04-01": 10, "2025-04-02": 20 },
        participantTrend: {
          individual: { "2025-04-01": 5, "2025-04-02": 10 },
          team: { "2025-04-01": 2, "2025-04-02": 3 },
        },
      },
    });

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await screen.findByText("Competitions");
    expect(screen.getByText("Participants")).toBeInTheDocument();
    expect(screen.getByText("Submissions")).toBeInTheDocument();
    expect(screen.getByText(/Approval Rate/i)).toBeInTheDocument();
  });

  it("shows (No data) if overview fetch fails", async () => {
    apiClient.get.mockRejectedValue(new Error("Network error"));

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await screen.findByText("(No data)");
  });
});
