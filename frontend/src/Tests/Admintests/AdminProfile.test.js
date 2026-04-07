import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminProfile from "../../Admin/AdminProfile";
import { MemoryRouter } from "react-router-dom";
import apiClient from '../../api/apiClient';

jest.mock("../../api/apiClient");

beforeEach(() => {
  localStorage.setItem("token", "fake-token");
  localStorage.setItem("userId", "fake-user-id");
  localStorage.setItem("role", "admin");

  apiClient.get.mockResolvedValue({
    data: {
      name: "Test Admin",
      email: "admin@example.com",
      description: "Admin of the platform",
      avatarUrl: "/test-avatar.png",
    },
  });

  apiClient.put.mockResolvedValue({ data: {} });
  apiClient.post.mockResolvedValue({ data: { avatarUrl: "/new-avatar.png" } });

  window.alert = jest.fn();
  window.URL.createObjectURL = jest.fn(() => "blob:fake-url");
  window.URL.revokeObjectURL = jest.fn();
});

afterEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

const renderAdminProfile = () => {
  render(
    <MemoryRouter>
      <AdminProfile />
    </MemoryRouter>
  );
};

describe("AdminProfile", () => {
  it("updates profile successfully", async () => {
    renderAdminProfile();

    fireEvent.change(await screen.findByPlaceholderText("Enter your name"), {
      target: { value: "New Admin" },
    });
    fireEvent.change(await screen.findByPlaceholderText("Enter your new password"), {
      target: { value: "NewPassword123" },
    });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Profile updated successfully");
    });
  });
});
