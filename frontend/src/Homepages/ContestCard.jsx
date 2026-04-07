/**
 * @file ContestCard.js
 * @description 
 * This component renders a contest card on the homepage, displaying basic contest information.
 * It allows users to:
 *  - Click the card to view contest details.
 *  - Vote for a contest (requires login and backend API interaction).
 *  - Join a contest (requires login and backend API interaction).
 * 
 * The card displays the contest's title, organizer, date, category, description, image, and current vote count.
 * It handles user interactions such as voting and joining, including frontend feedback and backend communication.
 * Material-UI components are used for layout, styling, and interactive elements.
 * 
 * Developer: Beiqi Dai
 */


import React from "react";
import "./ContestCard.css";
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Typography,
  IconButton,
} from "@mui/material";
import { Favorite, HowToVote, Flag, Category } from "@mui/icons-material";
import apiClient from '../api/apiClient';

function ContestCard({ contest, onCardClick }) {
  // Click event for the entire card
  const handleCardClick = () => {
    onCardClick && onCardClick(contest);
  };

  // Click event for Vote button: call backend API
  const handleVoteClick = async (e) => {
    e.stopPropagation();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first!");
      return;
    }

    try {
      await apiClient.post(`/interactions/votes/count`, null, {
        params: { submissionId: contest.id },
      });
      alert("Vote successful!");
    } catch (error) {
      const errMsg = error.response?.data?.error || error.response?.data?.message;
      if (errMsg === "Already voted") {
        alert("You have already voted!");
      } else {
        alert("Voting failed due to network or server error");
      }
    }
  };

  // Click event for Join button: call backend API
  const handleJoinClick = async (e) => {
    e.stopPropagation();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in first!");
      return;
    }

    try {
      await apiClient.post(`/registrations/${contest.id}`);
      alert("Joined successfully!");
    } catch (error) {
      const errMsg = error.response?.data?.error || error.response?.data?.message;
      if (errMsg === "Already JOIN!") {
        alert("You have already joined!");
      } else {
        alert("Joining failed due to network or server error");
      }
    }
  };

  return (
    <Card
      className="homepage-contest-card"
      onClick={handleCardClick}
      sx={{ maxWidth: 345, boxShadow: 3, cursor: "pointer" }}
    >
      <CardMedia
        component="img"
        height="200"
        image={contest.image}
        alt={contest.title}
      />
  
      <CardContent className="homepage-card-body">
        <Typography variant="h6" component="div" className="homepage-title">
          {contest.title}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" className="homepage-organizer">
          <strong>Organizer:</strong> {contest.organizer}
        </Typography>
        <Typography variant="body2" color="text.secondary" className="homepage-date">
          <strong>Date:</strong> {contest.date}
        </Typography>
        <Typography
          variant="body2"
          sx={{ display: "flex", alignItems: "center", mt: 1 }}
        >
          <Category sx={{ fontSize: 18, marginRight: 1, color: "gray" }} />
          {contest.category}
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }} className="homepage-description">
          {contest.description}
        </Typography>
      </CardContent>
  
      <CardActions className="homepage-card-footer">
        {/* Voting icon + vote count */}
        <div className="homepage-vote-info">
          <IconButton color="primary" onClick={handleVoteClick}>
            <HowToVote />
            <Typography variant="body2" sx={{ ml: 0.5 }} className="homepage-vote-count">
              {contest.votes}
            </Typography>
          </IconButton>
        </div>
  
        {/* Button group: Vote + Join */}
        <div className="homepage-button-group">
          <Button
            className="homepage-vote-button"
            variant="outlined"
            startIcon={<Favorite />}
            onClick={handleVoteClick}
          >
            Vote
          </Button>
  
          <Button
            className="homepage-join-button"
            variant="contained"
            startIcon={<Flag />}
            onClick={handleJoinClick}
          >
            Join
          </Button>
        </div>
      </CardActions>
    </Card>
  );
}

export default ContestCard;
