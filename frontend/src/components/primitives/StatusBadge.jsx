import { Chip } from '@mui/material';
import tokens from '../../theme/tokens';

const STATUS_COLORS = {
  UPCOMING:  { bg: tokens.colors.primary.light,  text: tokens.colors.primary.dark },
  ONGOING:   { bg: tokens.colors.success.light,  text: tokens.colors.success.dark },
  ENDED:     { bg: tokens.colors.grey[300],       text: tokens.colors.grey[700]   },
  CANCELLED: { bg: tokens.colors.error.light,    text: tokens.colors.error.dark   },
  DEFAULT:   { bg: tokens.colors.grey[200],       text: tokens.colors.grey[600]   },
};

/**
 * Consistent status badge for competition/submission statuses.
 */
export default function StatusBadge({ status, label, sx = {} }) {
  const colors = STATUS_COLORS[status?.toUpperCase()] ?? STATUS_COLORS.DEFAULT;
  return (
    <Chip
      label={label ?? status}
      size="small"
      sx={{
        backgroundColor: colors.bg,
        color: colors.text,
        fontWeight: tokens.typography.weights.semibold,
        fontSize: tokens.typography.sizes.xs,
        borderRadius: tokens.radius.full,
        ...sx,
      }}
    />
  );
}
