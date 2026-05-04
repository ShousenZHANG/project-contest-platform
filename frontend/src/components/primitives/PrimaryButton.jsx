import { Button } from '@mui/material';
import tokens from '../../theme/tokens';

/**
 * Token-bound primary button. Use instead of raw MUI Button for consistent styling.
 */
export default function PrimaryButton({ children, sx = {}, ...props }) {
  return (
    <Button
      variant="contained"
      sx={{
        borderRadius: tokens.radius.md,
        fontWeight: tokens.typography.weights.semibold,
        textTransform: 'none',
        boxShadow: 'none',
        '&:hover': { boxShadow: tokens.shadows.card },
        transition: tokens.transitions.fast,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
