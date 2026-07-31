import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import OrganizerContest from "../../Organizer/Contest";
import { renderWithProviders } from "../testUtils";
import apiClient from '../../api/apiClient';

jest.mock("../../api/apiClient");

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ email: "test@example.com" }),
  };
});

beforeEach(() => {
  jest.spyOn(Storage.prototype, "getItem").mockImplementation((key) => {
    if (key === "email") return "test@example.com";
    if (key === "token") return "mock-token";
    return null;
  });

  apiClient.post.mockResolvedValue({ data: { message: "Contest created" } });

  mockNavigate.mockClear();
});

const renderWithRouter = () => {
  renderWithProviders(<OrganizerContest />);
};

describe("OrganizerContest", () => {
  it("renders form fields", () => {
    renderWithRouter();
    expect(screen.getByPlaceholderText("Enter contest name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Describe your contest...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Contest" })).toBeInTheDocument();
  });

  it("can add and remove scoring criteria", () => {
    renderWithRouter();
    const input = screen.getByPlaceholderText("Enter scoring criteria");
    fireEvent.change(input, { target: { value: "Creativity" } });
    fireEvent.click(screen.getByText("Add"));
    expect(screen.getByText("Creativity")).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", { name: /Remove criterion/i });
    fireEvent.click(deleteButton);
    expect(screen.queryByText("Creativity")).not.toBeInTheDocument();
  });

  it("submits form and navigates on success", async () => {
    renderWithRouter();

    fireEvent.change(screen.getByPlaceholderText("Enter contest name"), {
      target: { value: "My Contest" },
    });

    fireEvent.change(screen.getByPlaceholderText("Describe your contest..."), {
      target: { value: "A test contest" },
    });

    fireEvent.change(screen.getByTestId("start-date"), {
      target: { value: "2025-05-01" },
    });

    fireEvent.change(screen.getByTestId("end-date"), {
      target: { value: "2025-05-10" },
    });

    // Satisfy the zod validation now enforced on the create form: a category,
    // at least one scoring criterion, and at least one submission format.
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Programming & Technology" },
    });

    fireEvent.change(screen.getByPlaceholderText("Enter scoring criteria"), {
      target: { value: "Innovation" },
    });
    fireEvent.click(screen.getByText("Add"));

    fireEvent.click(screen.getByLabelText("PDF"));

    fireEvent.click(screen.getByRole("button", { name: "Create Contest" }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/OrganizerContestList/test@example.com");
    });
  });
});
