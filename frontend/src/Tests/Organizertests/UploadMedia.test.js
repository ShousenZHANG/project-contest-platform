import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../testUtils";
import UploadMedia from "../../Organizer/UploadMedia";
import apiClient from '../../api/apiClient';

jest.mock('../../api/apiClient');
beforeEach(() => {
  apiClient.get.mockResolvedValue({ data: { name: 'Media competition', status: 'ONGOING', imageUrls: [] } });
  apiClient.post.mockResolvedValue({ data: {} });
  global.URL.revokeObjectURL = jest.fn();
});

beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
});

afterAll(() => {
  jest.resetAllMocks();
});

beforeEach(() => {
  jest.spyOn(window, "alert").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("UploadMedia Component", () => {
  test("previews selected files", async () => {
    renderWithProviders(<UploadMedia />);
  
    const fileInput = screen.getByTestId('file-input');
    const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });
  
    fireEvent.change(fileInput, { target: { files: [file] } });
  
    await waitFor(() => {
      expect(screen.getByAltText("preview-0")).toBeInTheDocument();
    });
  });  

  test("cancels upload and navigates back", async () => {
    renderWithProviders(<UploadMedia />);

    const cancelButton = await screen.findByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(cancelButton).toBeInTheDocument();
  });
});
