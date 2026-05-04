import { Paper } from '@mui/material';
import tokens from '../../theme/tokens';

/**
 * Token-bound card surface.
 */
export default function Card({ children, sx = {}, ...props }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: tokens.radius.lg,
        boxShadow: tokens.shadows.card,
        p: `${tokens.spacing.md}px`,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Paper>
  );
}
