
import Button from '@mui/material/Button';

import { deleteAxiosAuthToken } from 'src/lib/axios';



// ----------------------------------------------------------------------

export function SignOutButton({ onClose, sx, ...other }) {

  const handleLogout = () => {
    deleteAxiosAuthToken();
  }
  return (
    <Button
      fullWidth
      variant="soft"
      size="large"
      color="error"
      href='/auth/logout'
      onClick={handleLogout}
      sx={sx}
      {...other}
    >
      Logout
    </Button>
  );
}
