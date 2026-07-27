import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../testUtils";
import SubmissionRatings from "../../Organizer/SubmissionRatings";
import apiClient from '../../api/apiClient';

jest.mock("../../api/apiClient");

const mockedNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ competitionId: "test-competition-id" }),
  useNavigate: () => mockedNavigate,
}));

beforeEach(() => {
  localStorage.setItem("token", "fake-token");
  localStorage.setItem("userId", "user-123");
  localStorage.setItem("role", "organizer");
  jest.clearAllMocks();
  window.alert = jest.fn();

  apiClient.get.mockResolvedValue({
    data: { data: [] },
  });

  apiClient.post.mockResolvedValue({ data: {} });
});

afterEach(() => {
  localStorage.clear();
});

describe("SubmissionRatings", () => {
  it("renders rated submissions table after data loads", async () => {
    renderWithProviders(<SubmissionRatings />);

    await waitFor(() => {
      expect(screen.getByText("Rated Submissions Comparison")).toBeInTheDocument();
    });
  });

  it("triggers auto award when clicking the button", async () => {
    renderWithProviders(<SubmissionRatings />);

    const autoAwardButton = await screen.findByText(/Auto Award Winners/i);
    fireEvent.click(autoAwardButton);

    await waitFor(() => {
      // competitionId now travels as an Axios param rather than being baked
      // into the path string; the request on the wire is identical.
      expect(apiClient.post).toHaveBeenCalledWith(
        "/winners/auto-award",
        null,
        expect.objectContaining({
          params: { competitionId: "test-competition-id" },
        })
      );
    });
  });

  it("navigates back to submissions list when clicking back button", async () => {
    renderWithProviders(<SubmissionRatings />);

    const backButton = await screen.findByText(/Back to Submissions List/i);
    fireEvent.click(backButton);

    expect(mockedNavigate).toHaveBeenCalledWith("/OrganizerSubmissions/test-competition-id");
  });
});
