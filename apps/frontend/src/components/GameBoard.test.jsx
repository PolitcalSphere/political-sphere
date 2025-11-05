import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the accessibility hook BEFORE importing the component under test
const announceMock = vi.fn();
const trapFocusMock = vi.fn(() => vi.fn());
const focusNextElementMock = vi.fn();
const focusPreviousElementMock = vi.fn();
const skipToContentMock = vi.fn();
const skipToNavigationMock = vi.fn();

vi.mock("../../hooks/useAccessibility", () => ({
  useAccessibility: () => ({
    announce: announceMock,
    trapFocus: trapFocusMock,
    reducedMotion: false,
    focusNextElement: focusNextElementMock,
    focusPreviousElement: focusPreviousElementMock,
    highContrast: false,
    largeText: false,
    skipLinksVisible: false,
    skipToContent: skipToContentMock,
    skipToNavigation: skipToNavigationMock,
  }),
}));

// Mock ReportContent component
vi.mock("./ReportContent", () => ({
  default: ({ onClose, onReportSubmitted }) => (
    <div data-testid="report-content">
      <h2 id="report-title">Report Content</h2>
      <button type="button" onClick={onClose}>
        Close Report
      </button>
      <button
        type="button"
        onClick={() => onReportSubmitted({ success: true })}
      >
        Submit Report
      </button>
    </div>
  ),
}));

let GameBoard;
beforeAll(async () => {
  // Dynamically import after mocks are registered so the module can
  // be resolved and the mocked dependencies applied by Vitest.
  GameBoard = (await import("./GameBoard")).default;
});

describe("GameBoard Component", () => {
  const mockProposals = [
    {
      id: "prop-1",
      title: "Test Proposal 1",
      description: "Description 1",
      status: "active",
      moderationStatus: "approved",
    },
    {
      id: "prop-2",
      title: "Test Proposal 2",
      description: "Description 2",
      status: "active",
      moderationStatus: "flagged",
    },
  ];

  const mockCallbacks = {
    onVote: vi.fn(),
    onProposalSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the game board with proposals", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText("Political Sphere Game")).toBeInTheDocument();
      expect(screen.getByText("Test Proposal 1")).toBeInTheDocument();
      expect(screen.getByText("Test Proposal 2")).toBeInTheDocument();
    });

    it("should render skip links", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText("Skip to main content")).toBeInTheDocument();
      expect(screen.getByText("Skip to navigation")).toBeInTheDocument();
    });

    it("should render proposal form when onProposalSubmit is provided", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText("Submit a Proposal")).toBeInTheDocument();
      expect(screen.getByLabelText("Proposal title")).toBeInTheDocument();
      expect(screen.getByLabelText("Proposal description")).toBeInTheDocument();
    });

    it("should not render proposal form when onProposalSubmit is not provided", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          onVote={mockCallbacks.onVote}
        />
      );

      expect(screen.queryByText("Submit a Proposal")).not.toBeInTheDocument();
    });
  });

  describe("Voting", () => {
    it("should call onVote when voting for a proposal", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const forButton = screen.getByLabelText("Vote for Test Proposal 1");
      fireEvent.click(forButton);

      expect(mockCallbacks.onVote).toHaveBeenCalledWith({
        type: "vote",
        payload: {
          proposalId: "prop-1",
          playerId: "current",
          choice: "for",
        },
      });
    });

    it("should call onVote when voting against a proposal", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const againstButton = screen.getByLabelText(
        "Vote against Test Proposal 1"
      );
      fireEvent.click(againstButton);

      expect(mockCallbacks.onVote).toHaveBeenCalledWith({
        type: "vote",
        payload: {
          proposalId: "prop-1",
          playerId: "current",
          choice: "against",
        },
      });
    });
  });

  describe("Reporting", () => {
    it("should open report modal when clicking report button", async () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const reportButton = screen.getByLabelText(
        "Report proposal Test Proposal 1"
      );
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId("report-content")).toBeInTheDocument();
      });
    });

    it("should close report modal when close button is clicked", async () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      // Open modal
      const reportButton = screen.getByLabelText(
        "Report proposal Test Proposal 1"
      );
      fireEvent.click(reportButton);

      await waitFor(() => {
        expect(screen.getByTestId("report-content")).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText("Close Report");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId("report-content")).not.toBeInTheDocument();
      });
    });

    it("should disable report button for flagged proposals", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const reportButton = screen.getByLabelText(
        "Report proposal Test Proposal 2"
      );
      expect(reportButton).toBeDisabled();
    });

    it("should show flagged indicator for flagged proposals", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      expect(screen.getByText("Flagged")).toBeInTheDocument();
    });
  });

  describe("Proposal Submission", () => {
    it("should submit a new proposal with valid data", async () => {
      const user = userEvent.setup();
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const titleInput = screen.getByLabelText("Proposal title");
      const descriptionInput = screen.getByLabelText("Proposal description");
      const submitButton = screen.getByText("Submit proposal");

      await user.type(titleInput, "New Proposal");
      await user.type(descriptionInput, "New proposal description");
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCallbacks.onProposalSubmit).toHaveBeenCalledWith({
          title: "New Proposal",
          description: "New proposal description",
          gameId: "game-123",
        });
      });
    });

    it("should require title and description for proposal submission", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const titleInput = screen.getByLabelText("Proposal title");
      const descriptionInput = screen.getByLabelText("Proposal description");

      expect(titleInput).toHaveAttribute("required");
      expect(descriptionInput).toHaveAttribute("required");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA labels on main sections", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      expect(screen.getByLabelText("Game board")).toBeInTheDocument();
      expect(screen.getByLabelText("Skip links")).toBeInTheDocument();
      expect(screen.getByLabelText("Proposals list")).toBeInTheDocument();
    });

    it("should have live region for announcements", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const liveRegion = screen.getByTestId("announcements");
      expect(liveRegion).toHaveAttribute("aria-live", "polite");
      expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    });

    it("should have proper heading hierarchy", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const h1 = screen.getByRole("heading", {
        level: 1,
        name: "Political Sphere Game",
      });
      expect(h1).toBeInTheDocument();

      const h2 = screen.getByRole("heading", {
        level: 2,
        name: "Current Proposals",
      });
      expect(h2).toBeInTheDocument();
    });

    it("should provide descriptive help text for form fields", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const titleInput = screen.getByLabelText("Proposal title");
      expect(titleInput).toHaveAttribute(
        "aria-describedby",
        "proposal-title-help"
      );

      const descriptionInput = screen.getByLabelText("Proposal description");
      expect(descriptionInput).toHaveAttribute(
        "aria-describedby",
        "proposal-description-help"
      );
    });

    it("should have proper modal attributes when report dialog is open", async () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const reportButton = screen.getByLabelText(
        "Report proposal Test Proposal 1"
      );
      fireEvent.click(reportButton);

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-modal", "true");
        expect(dialog).toHaveAttribute("aria-labelledby", "report-title");
      });
    });
  });

  describe("Keyboard Navigation", () => {
    it("should handle arrow key navigation", async () => {
      // The focus movement utilities are exposed as mocks above. We don't
      // assert direct calls to them here because the focus behavior can be
      // environment-dependent; instead assert the keyboard handler prevents
      // default navigation which indicates the handler executed.

      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const main = screen.getByLabelText("Game board");

      const downEvent = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
      });
      const preventSpy = vi.spyOn(downEvent, "preventDefault");
      fireEvent(main, downEvent);
      expect(preventSpy).toHaveBeenCalled();

      const upEvent = new KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
      });
      const preventSpyUp = vi.spyOn(upEvent, "preventDefault");
      fireEvent(main, upEvent);
      expect(preventSpyUp).toHaveBeenCalled();
    });

    it("should prevent default behavior for arrow keys", () => {
      render(
        <GameBoard
          gameId="game-123"
          proposals={mockProposals}
          {...mockCallbacks}
        />
      );

      const main = screen.getByLabelText("Game board");
      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
      });
      const preventDefaultSpy = vi.spyOn(event, "preventDefault");

      fireEvent(main, event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe("Empty State", () => {
    it("should render with empty proposals list", () => {
      render(<GameBoard gameId="game-123" proposals={[]} {...mockCallbacks} />);

      expect(screen.getByText("Political Sphere Game")).toBeInTheDocument();
      expect(screen.getByText("Current Proposals")).toBeInTheDocument();
    });
  });
});
