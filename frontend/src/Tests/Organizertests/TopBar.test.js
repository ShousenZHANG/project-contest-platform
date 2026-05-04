import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TopBar from "../../Organizer/TopBar";
import apiClient from '../../api/apiClient';

jest.mock("../../api/apiClient");

const mockNavigate = jest.fn();
const mockLocationReload = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

beforeAll(() => {
  apiClient.get.mockResolvedValue({
    data: { avatarUrl: "/mock-avatar.jpg" },
  });

  apiClient.post.mockResolvedValue({ data: {} });

  Object.defineProperty(window, "location", {
    writable: true,
    value: { href: "", reload: mockLocationReload },
  });
});

beforeEach(() => {
  localStorage.setItem("email", "test@example.com");
  localStorage.setItem("token", "fake-token");
  jest.clearAllMocks();

  apiClient.get.mockResolvedValue({
    data: { avatarUrl: "/mock-avatar.jpg" },
  });

  apiClient.post.mockResolvedValue({ data: {} });
});

afterEach(() => {
  localStorage.clear();
});

describe("TopBar", () => {
  it("renders email from localStorage", async () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    );
    expect(await screen.findByText("test@example.com")).toBeInTheDocument();
  });

  it("loads and displays avatar from server", async () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/users/profile");
    });
    expect(screen.getByRole("button", { name: /Open profile/i })).toBeInTheDocument();
  });

  it("navigates to profile page when clicking avatar", async () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: /Open profile/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/OrganizerProfile/test@example.com");
  });

  it("shows logout confirmation dialog when clicking logout icon", async () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Log out/i }));

    await waitFor(() => {
      expect(screen.getByText("Log out reminder")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to log out?")).toBeInTheDocument();
    });
  });

  it("logs out and redirects when confirmed", async () => {
    render(
      <MemoryRouter>
        <TopBar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Log out/i }));

    const logoutButton = await screen.findByText("Log out");
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });

    expect(localStorage.getItem("token")).toBeNull();
  });
});
