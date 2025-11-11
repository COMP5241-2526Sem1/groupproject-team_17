'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useBoolean } from 'minimal-shared/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Stack, Typography } from '@mui/material';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter } from 'src/routes/hooks';

import { Field, schemaUtils } from 'src/components/hook-form';
import { Iconify } from 'src/components/iconify';

import { CONFIG } from 'src/global-config';
import { FormHead } from '../../components/form-head';
import { signInWithPassword } from '../../context/jwt';
import { getErrorMessage } from '../../utils';

// ----------------------------------------------------------------------

export const SignInSchema = z.object({
  email: schemaUtils.email(),
  password: z
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
});

// ----------------------------------------------------------------------

export function JwtSignInView() {
  const router = useRouter();

  const showPassword = useBoolean();

  const [errorMessage, setErrorMessage] = useState(null);

  const defaultValues = {
    email: 'demo@minimals.cc',
    password: '@2Minimal',
  };

  const methods = useForm({
    resolver: zodResolver(SignInSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await signInWithPassword({ email: data.email, password: data.password });

      router.refresh();
    } catch (error) {
      console.error(error);
      const feedbackMessage = getErrorMessage(error);
      setErrorMessage(feedbackMessage);
    }
  });

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Field.Text name="email" label="Email address" slotProps={{ inputLabel: { shrink: true } }} />

      <Box sx={{ gap: 1.5, display: 'flex', flexDirection: 'column' }}>
        <Field.Text
          name="password"
          label="Password"
          placeholder="6+ characters"
          type={showPassword.value ? 'text' : 'password'}
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={showPassword.onToggle} edge="end">
                    <Iconify
                      icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'}
                    />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Button
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator="Sign in..."
      >
        Sign in
      </Button>
    </Box>
  );

  return (
    <>
      <Typography variant="h2" sx={{ mb: 0, mt: 1, color: 'text.secondary', textAlign: 'center' }}>
        {CONFIG.appName}
      </Typography>
      <FormHead

        description={
          <>

          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}
      <Typography variant='body' sx={{ mb: 3, mt: 1, color: 'text.secondary', textAlign: 'center' }}>
        Sign in with your social account
      </Typography>
      <Stack gap={2} direction="column" alignItems="center" justifyContent="center">
        <Button
          fullWidth
          color="inherit"
          size="large"
          variant="outlined"
          loadingIndicator="Sign in..."
          startIcon={<Iconify width={22} icon="socials:google" />}
          href="/auth/login?connection=google-oauth2"
        >
          Sign in with Google
        </Button>
        <Button
          fullWidth
          color="inherit"
          size="large"
          variant="outlined"
          loadingIndicator="Sign in..."
          startIcon={<Iconify width={22} icon="socials:github" />}
          href="/auth/login?connection=github"
        >
          Sign in with GitHub
        </Button>
        <Button
          fullWidth
          color="inherit"
          size="large"
          variant="outlined"
          loadingIndicator="Sign in..."
          startIcon={<Iconify width={22} icon="socials:twitter" />}
          href="/auth/login?connection=twitter"
        >
          Sign in with Twitter
        </Button>
      </Stack>
    </>
  );
}
