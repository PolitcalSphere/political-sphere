/**
 * GameBoard Component
 * Main game interface for political simulation
 * Integrates accessibility and reporting features
 */

import React, { useEffect, useState } from 'react';
import { useAccessibility } from '../hooks/useAccessibility.js';
import ReportContent from './ReportContent';
import './GameBoard.css'; // Assume CSS exists or create later

const GameBoard = ({ gameId, proposals, onProposalSubmit, onVote }) => {
  const [showReport, setShowReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    announce,
    trapFocus,
    reducedMotion,
    focusNextElement,
    focusPreviousElement,
    highContrast,
    largeText,
    skipLinksVisible,
    skipToContent,
    skipToNavigation,
  } = useAccessibility();

  useEffect(() => {
    announce(`Game board loaded with ${proposals.length} proposals`, 'polite');
  }, [proposals, announce]);

  const handleVote = (proposalId, choice) => {
    if (onVote) {
      onVote({
        type: 'vote',
        payload: { proposalId, playerId: 'current', choice },
      });
      announce(`Voted ${choice} on proposal`, 'polite');
    }
  };

  const openReport = proposal => {
    setShowReport(proposal);
    setIsModalOpen(true);
    announce('Report dialog opened', 'assertive');
  };

  const closeReport = () => {
    setIsModalOpen(false);
    setShowReport(null);
    announce('Report dialog closed', 'polite');
  };

  const handleKeyDown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusNextElement();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusPreviousElement();
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      const modal = document.querySelector('.report-modal');
      if (modal) {
        const cleanup = trapFocus(modal);
        return cleanup;
      }
    }
  }, [isModalOpen, trapFocus]);

  return (
    <>
      <nav aria-label="Skip links" className={`skip-links ${skipLinksVisible ? 'is-visible' : ''}`}>
        <button
          type="button"
          onClick={event => {
            event.preventDefault();
            skipToContent();
          }}
        >
          Skip to main content
        </button>
        <button type="button" onClick={skipToNavigation}>
          Skip to navigation
        </button>
      </nav>
      <main
        id="main-content"
        tabIndex={-1}
        className={`game-board ${highContrast ? 'high-contrast' : ''} ${
          largeText ? 'large-text' : ''
        } ${reducedMotion ? 'reduced-motion' : ''}`}
        aria-label="Game board"
        onKeyDown={handleKeyDown}
      >
        <header>
          <h1>Political Sphere Game</h1>
          <nav aria-label="Game navigation" tabIndex={-1}>
            <button type="button" onClick={() => focusNextElement()}>
              Next Proposal
            </button>
            <button type="button" onClick={() => focusPreviousElement()}>
              Previous Proposal
            </button>
          </nav>
        </header>

        <section
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="announcements"
        >
          {/* Live announcements inserted via accessibility hook */}
        </section>

        <section aria-label="Proposals list">
          <h2>Current Proposals</h2>
          <ul>
            {proposals.map(proposal => (
              <li key={proposal.id} aria-labelledby={`proposal-${proposal.id}-title`}>
                <article id={`proposal-${proposal.id}`}>
                  <header>
                    <h3 id={`proposal-${proposal.id}-title`}>{proposal.title}</h3>
                    <p>{proposal.description}</p>
                    <span>Status: {proposal.status}</span>
                    {proposal.moderationStatus === 'flagged' && (
                      <span className="flagged">Flagged</span>
                    )}
                  </header>
                  <div className="proposal-actions">
                    <button
                      type="button"
                      onClick={() => handleVote(proposal.id, 'for')}
                      aria-label={`Vote for ${proposal.title}`}
                    >
                      For
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVote(proposal.id, 'against')}
                      aria-label={`Vote against ${proposal.title}`}
                    >
                      Against
                    </button>
                    <button
                      type="button"
                      onClick={() => openReport(proposal)}
                      aria-label={`Report proposal ${proposal.title}`}
                      disabled={proposal.moderationStatus === 'flagged'}
                    >
                      Report
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>

        {isModalOpen && showReport && (
          <div
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <ReportContent
              contentId={showReport.id}
              contentType="proposal"
              onClose={closeReport}
              onReportSubmitted={() => {
                announce('Report submitted', 'polite');
                // Optionally update proposal status
              }}
            />
          </div>
        )}

        {onProposalSubmit && (
          <section aria-labelledby="new-proposal-heading" className="proposal-form">
            <h2 id="new-proposal-heading">Submit a Proposal</h2>
            <form
              onSubmit={event => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const title = formData.get('proposalTitle');
                const description = formData.get('proposalDescription');

                if (title && description && onProposalSubmit) {
                  onProposalSubmit({
                    title,
                    description,
                    gameId,
                  });
                  announce('Proposal submitted for review', 'polite');
                  event.currentTarget.reset();
                }
              }}
            >
              <div className="proposal-form-field">
                <label htmlFor="proposal-title">Proposal title</label>
                <input
                  id="proposal-title"
                  name="proposalTitle"
                  type="text"
                  required
                  aria-describedby="proposal-title-help"
                />
                <span id="proposal-title-help" className="sr-only">
                  Provide a concise summary describing the policy change
                </span>
              </div>

              <div className="proposal-form-field">
                <label htmlFor="proposal-description">Proposal description</label>
                <textarea
                  id="proposal-description"
                  name="proposalDescription"
                  required
                  rows={4}
                  aria-describedby="proposal-description-help"
                />
                <span id="proposal-description-help" className="sr-only">
                  Include key points, objectives, and any supporting evidence
                </span>
              </div>

              <button type="submit" className="proposal-form-submit">
                Submit proposal
              </button>
            </form>
          </section>
        )}
      </main>
    </>
  );
};

export default GameBoard;
