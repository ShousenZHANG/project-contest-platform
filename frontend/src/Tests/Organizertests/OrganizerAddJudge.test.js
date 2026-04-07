import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrganizerAddJudge from "../../Organizer/OrganizerAddJudge";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import apiClient from '../../api/apiClient';

jest.mock("../../api/apiClient");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ competitionId: "test-competition" }),
  };
});

beforeEach(() => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
    if (key === "email") return "test@example.com";
    if (key === "token") return "mock-token";
    if (key === "userId") return "mock-user-id";
    if (key === "role") return "organizer";
    return null;
  });

  window.confirm = jest.fn(() => true);

  apiClient.get.mockImplementation((url) => {
    if (url.includes("/competitions/test-competition/judges")) {
      return Promise.resolve({
        data: { data: [{ id: 1, email: "judge1@example.com" }], pages: 1 },
      });
    }
    if (url.includes("/registrations/test-competition/participants")) {
      return Promise.resolve({
        data: { data: [{ email: "participant@example.com" }] },
      });
    }
    if (url.includes("/competitions/test-competition")) {
      return Promise.resolve({
        data: { name: "Test Competition" },
      });
    }
    return Promise.reject(new Error("Unknown URL"));
  });

  apiClient.post.mockResolvedValue({ data: "Judge added" });
  apiClient.delete.mockResolvedValue({ data: "Judge deleted" });

  mockNavigate.mockClear();
});

const renderWithRouter = () => {
  render(
    <MemoryRouter initialEntries={["/organizer-add-judge/test-competition"]}>
      <Routes>
        <Route path="/organizer-add-judge/:competitionId" element={<OrganizerAddJudge />} />
      </Routes>
    </MemoryRouter>
  );
};

describe("OrganizerAddJudge", () => {
  test("renders competition name and judges list", async () => {
    renderWithRouter();
    expect(await screen.findByText(/Judges for: Test Competition/i)).toBeInTheDocument();
    expect(await screen.findByText("judge1@example.com")).toBeInTheDocument();
  });

  test("adds a new judge", async () => {
    renderWithRouter();
    fireEvent.change(screen.getByLabelText(/Judge Email\(s\)/i), {
      target: { value: "newjudge@example.com" },
    });
    fireEvent.click(screen.getByText(/Add Judge/i));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("/assign-judges"),
        expect.objectContaining({
          judgeEmails: ["newjudge@example.com"],
        })
      );
    });
  });

  test("deletes a judge", async () => {
    renderWithRouter();
    expect(await screen.findByText("judge1@example.com")).toBeInTheDocument();
    const deleteButton = screen.getByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining("/judges/1")
      );
    });
  });
});
