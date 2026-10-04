import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import ParticipantList from "../../Organizer/ParticipantList";
import { renderWithProviders } from "../testUtils";
import apiClient from '../../api/apiClient';
import { useLocation } from 'react-router-dom';

jest.mock("../../api/apiClient");

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ competitionId: "test-competition" }),
    useLocation: jest.fn(() => ({ pathname: "/OrganizerDashboard/test@example.com", state: { participationType: "INDIVIDUAL" } })),
    MemoryRouter: actual.MemoryRouter,
    Routes: actual.Routes,
    Route: actual.Route,
  };
});

beforeEach(() => {
  useLocation.mockReturnValue({ pathname: '/OrganizerParticipantList/test-competition', state: { participationType: 'INDIVIDUAL' } });
  jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
    if (key === "email") return "test@example.com";
    if (key === "token") return "mock-token";
    if (key === "userId") return "mock-user-id";
    if (key === "role") return "organizer";
    return null;
  });

  apiClient.get.mockImplementation((url) => {
    if (url.includes("/competitions/managed/test-competition")) {
      return Promise.resolve({
        data: {
          name: "Test Competition",
          category: "Art",
          startDate: "2025-05-01",
          endDate: "2025-05-10",
          status: "Ongoing",
          participationType: "INDIVIDUAL",
        },
      });
    }
    if (url.includes("/registrations/test-competition/participants")) {
      return Promise.resolve({
        data: {
          data: [
            {
              userId: "user123",
              name: "Alice",
              email: "alice@example.com",
              description: "Participant",
              registeredAt: new Date().toISOString(),
            },
          ],
          pages: 1,
          total: 1,
        },
      });
    }
    return Promise.resolve({ data: {} });
  });

  window.URL.createObjectURL = jest.fn();
  mockNavigate.mockClear();
});

const renderWithRouter = () => {
  renderWithProviders(<ParticipantList />, {
    route: "/participant-list/test-competition",
    routePath: "/participant-list/:competitionId",
  });
};

describe("ParticipantList", () => {
  it("renders competition info and participant list", async () => {
    renderWithRouter();

    expect(await screen.findByText(/Participants for: Test Competition/i)).toBeInTheDocument();

    const table = screen.getByRole("table");
    const nameCell = within(table).getByText("Alice");
    expect(nameCell).toBeInTheDocument();

    const emailCell = within(table).getByText("alice@example.com");
    expect(emailCell).toBeInTheDocument();
  });

  it("allows searching participants", async () => {
    renderWithRouter();
    const searchInput = await screen.findByLabelText(/Search by name/i);
    fireEvent.change(searchInput, { target: { value: "Alice" } });

    await waitFor(() => {
      // Query values now travel as Axios params rather than being baked into
      // the path; the request on the wire is unchanged.
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining("/participants"),
        expect.objectContaining({
          params: expect.objectContaining({ page: 1, size: 10, keyword: "Alice" }),
        })
      );
    });
  });

  it("clicks export csv button", async () => {
    renderWithRouter();
    const exportButton = await screen.findByRole("button", { name: /Export CSV/i });
    fireEvent.click(exportButton);

    expect(exportButton).toBeInTheDocument();
  });

  it("clicks back button to navigate", async () => {
    renderWithRouter();
    const backButton = await screen.findByRole("button", { name: /Back to Contest List/i });
    fireEvent.click(backButton);
    expect(mockNavigate).toHaveBeenCalledWith("/OrganizerContestList/test@example.com");
  });

  it('uses the managed roster and real TeamInfoVO identifiers for a private team competition', async () => {
    useLocation.mockReturnValue({ pathname: '/OrganizerParticipantList/test-competition', state: null });
    apiClient.get.mockImplementation((url) => {
      if (url === '/competitions/managed/test-competition') {
        return Promise.resolve({ data: { name: 'Private team contest', participationType: 'TEAM', isPublic: false, status: 'ONGOING' } });
      }
      if (url === '/registrations/teams/list') {
        return Promise.resolve({ data: { data: [{ teamId: 'real-team-id', teamName: 'Private team', description: 'Registered team', createdAt: '2026-10-01T00:00:00' }], total: 1, pages: 1 } });
      }
      return Promise.reject(new Error(`Unexpected public roster read: ${url}`));
    });
    apiClient.delete.mockResolvedValue({ data: { success: true, data: 'Removed' } });
    renderWithRouter();
    expect(await screen.findByText('Private team')).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/registrations/teams/list', {
      params: { competitionId: 'test-competition', page: 1, size: 10, keyword: '', sortBy: 'createdAt', order: 'asc' },
    });
    expect(apiClient.get.mock.calls.some(([url]) => url.startsWith('/registrations/public/'))).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/registrations/teams/test-competition/team/real-team-id/by-organizer'));
  });
});
