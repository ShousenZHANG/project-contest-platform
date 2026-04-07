import apiClient from '../../api/apiClient';
/**
 * @file teamApi.js
 * @description
 * This module provides a set of API utility functions for managing team operations
 * such as fetching, creating, updating, joining, leaving, and deleting teams.
 *
 * Main Functions:
 *  - fetchJoinedTeams: Fetch all teams the user has joined.
 *  - fetchTeams: Fetch paginated public teams with optional sorting and keyword filtering.
 *  - fetchMyTeams: Fetch the user's own created/joined teams.
 *  - createTeam: Create a new team.
 *  - joinTeam: Join a public team.
 *  - leaveTeam: Leave a team.
 *  - deleteTeam: Delete a team (only allowed for the creator).
 *  - updateTeam: Update a team's name and description (only allowed for the creator).
 *  - getTeamCreator: Retrieve the creator's information of a specific team.
 *  - removeTeamMember: Remove a member from a team (only allowed for the creator).
 *  - getTeamDetail: Fetch detailed team information (public endpoint).
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */


export const fetchJoinedTeams = async (userData, setState) => {
  try {
    const res = await apiClient.get('/teams/my-joined', {
      params: { page: 1, size: 1000 }
    });
    const ids = (res.data.data || []).map(t => t.id);
    setState(new Set(ids));
  } catch (e) {
    console.error('[fetchJoinedTeams]', e);
  }
};

export const fetchTeams = async ({ page, keyword, sortBy, order }, setTeams, setPages) => {
  try {
    const res = await apiClient.get('/teams/public/all', {
      params: { page, size: 5, sortBy, order, keyword }
    });
    setTeams(res.data.data || []);
    setPages(res.data.pages || 1);
  } catch (e) {
    console.error('[fetchTeams]', e);
  }
};

export const fetchMyTeams = async (userData, setState) => {
  try {
    const res = await apiClient.get('/teams/my-joined', {
      params: { page: 1, size: 1000 }
    });
    setState(res.data.data || []);
  } catch (e) {
    console.error('[fetchMyTeams]', e);
  }
};

export const createTeam = async (name, description, userData, { onSuccess, onError }) => {
  try {
    await apiClient.post('/teams/create', { name, description });
    onSuccess();
  } catch (e) {
    const status = e.response?.status;
    const text = e.response?.data;
    onError(`Error ${status}: ${typeof text === 'string' ? text : JSON.stringify(text)}`);
  }
};

export const joinTeam = async (team, userData, setState, setMsg, setSuccess, setOpen) => {
  try {
    if (team.createdBy === userData.userId) throw new Error('You are the creator');
    await apiClient.post(`/teams/${team.id}/join`);
    setState(prev => new Set(prev).add(team.id));
    setMsg('Successfully joined');
    setSuccess(true);
    setOpen(true);
  } catch (e) {
    if (e.response?.status === 409) {
      setState(prev => new Set(prev).add(team.id));
      setMsg('Already a member');
      setSuccess(true);
      setOpen(true);
    } else {
      setMsg(`Join failed: ${e.message}`);
      setSuccess(false);
      setOpen(true);
    }
  }
};

export const leaveTeam = async (id, userData, setState, setMsg, setSuccess, setOpen) => {
  try {
    await apiClient.post(`/teams/${id}/leave`);
    setState(prev => {
      const copy = new Set(prev);
      copy.delete(id);
      return copy;
    });
    setMsg('Left successfully');
    setSuccess(true);
    setOpen(true);
  } catch (e) {
    const errMsg = e.response?.status === 403 ? 'Team leader cannot leave' : (e.response?.data || e.message);
    setMsg(`Leave failed: ${e.response?.status}: ${errMsg}`);
    setSuccess(false);
    setOpen(true);
  }
};

export const deleteTeam = async (id, userData, { onSuccess, onError }) => {
  try {
    await apiClient.delete(`/teams/${id}`);
    onSuccess && onSuccess();
  } catch (e) {
    if (e.response?.status === 403) {
      onError && onError('You are not authorized to delete this team.');
    } else if (e.response?.status === 404) {
      onError && onError('Team not found. It may have already been deleted.');
    } else {
      const text = e.response?.data;
      onError && onError(`Error ${e.response?.status}: ${typeof text === 'string' ? text : JSON.stringify(text)}`);
    }
  }
};


export const updateTeam = async (teamId, { name, description }, userData, { onSuccess, onError }) => {
  try {
    await apiClient.put(`/teams/${teamId}`, { name, description });
    onSuccess && onSuccess();
  } catch (err) {
    if (err.response?.status === 403) {
      onError && onError('You are not authorized to update this team.');
    } else if (err.response?.status === 404) {
      onError && onError('Team not found.');
    } else {
      const text = err.response?.data;
      onError && onError(`Error ${err.response?.status}: ${typeof text === 'string' ? text : JSON.stringify(text)}`);
    }
  }
};

/**
 * Obtain the information of the team creator (for determining permissions)
 * @param {string} teamId
 * @param {object} userData
 * @returns {Promise<{ id, name, email, avatarUrl, description, createdAt }>}
 */
export const getTeamCreator = async (teamId, userData) => {
  try {
    const res = await apiClient.get(`/teams/${teamId}/creator`);
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`Team ${teamId} not found.`);
    }
    const text = err.response?.data;
    throw new Error(`Error ${err.response?.status}: ${typeof text === 'string' ? text : JSON.stringify(text)}`);
  }
};

export const removeTeamMember = async (teamId, memberId, userData) => {
  try {
    await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
  } catch (err) {
    const msg = err.response?.data || err.message;
    throw new Error(`${err.response?.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }
};

export const getTeamDetail = async (teamId) => {
  const res = await apiClient.get(`/teams/public/${teamId}`);
  return res.data;
};
