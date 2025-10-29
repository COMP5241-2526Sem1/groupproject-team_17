'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import { useRouter, useSearchParams } from 'src/routes/hooks';

import { realtimeClassAPI } from 'src/api/api-function-call';

import { useClassroomContext } from 'auth-classroom';
import { Field, Form } from 'src/components/hook-form';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

// Join mode enum values
const JoinCheckingModeEnum = {
  Disabled: 0,
  StudentId: 1,
  StudentName: 2,
  Email: 4,
  PIN: 8,
};

// Helper function to check if a mode is required
const hasModeFlag = (combinedMode, flag) => (combinedMode & flag) === flag;

export const EnterClassCodeSchema = z.object({
  classCode: z
    .string()
    .min(1, { message: 'Class code is required!' })
    .min(4, { message: 'Class code must be at least 4 characters!' }),
  studentId: z.string().optional(),
  studentName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  pin: z.string().optional(),
});

// ----------------------------------------------------------------------

export function EnterClassCodeView() {
  const [classInfo, setClassInfo] = useState(null);
  const [selectedCombination, setSelectedCombination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const params = useSearchParams();

  const router = useRouter();

  const classroomContext = useClassroomContext();

  const [errorMessage, setErrorMessage] = useState(null);

  const defaultValues = {
    classCode: '',
    studentId: '',
    studentName: '',
    email: '',
    pin: '',
  };

  const methods = useForm({
    resolver: zodResolver(EnterClassCodeSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      setIsLoading(true);

      // If classInfo exists, verify student and join classroom
      if (classInfo) {
        // Verify the selected combination requirements
        const combination = selectedCombination || classInfo.joinCheckingModes[0];
        const missingFields = [];

        if (hasModeFlag(combination, JoinCheckingModeEnum.StudentId) && !data.studentId) {
          missingFields.push('Student ID');
        }
        if (hasModeFlag(combination, JoinCheckingModeEnum.StudentName) && !data.studentName) {
          missingFields.push('Student Name');
        }
        if (hasModeFlag(combination, JoinCheckingModeEnum.Email) && !data.email) {
          missingFields.push('Email');
        }
        if (hasModeFlag(combination, JoinCheckingModeEnum.PIN) && !data.pin) {
          missingFields.push('PIN');
        }

        if (missingFields.length > 0) {
          setErrorMessage(`Please fill in required fields: ${missingFields.join(', ')}`);
          setIsLoading(false);
          return;
        }

        // Call API to verify and join classroom
        const joinData = {
          courseId: classInfo.courseId,
          studentId: data.studentId,
          studentName: data.studentName,
          email: data.email,
          pin: data.pin,
        };

        const res = await realtimeClassAPI.studentJoinCourse(joinData);
        // Delay for 1s
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (res?.code === 0 && res?.data) {
          // Prepare student info with token
          const studentInfo = res.data

          // Update context
          classroomContext.joinClassroom(classInfo, studentInfo);
          classroomContext.setAuthencated(true);

          // Redirect to classroom
          router.push(`/classroom/${classInfo.courseId}`);
        } else {
          setErrorMessage(
            res?.message || 'Failed to join class. Please check your information and try again.'
          );
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Retrieve class join info from API
        const res = await realtimeClassAPI.getCourseJoinInfo(data.classCode);

        if (res?.code === 0 && res?.data) {
          setClassInfo(res.data);
          // Check if no verification is required or only one combination exists
          const modes = res.data.joinCheckingModes || [0];
          if (modes.length === 1) {
            // If no verification required (0), set to Student ID (1) as minimum
            if (modes[0] === 0) {
              setSelectedCombination(1); // Force Student ID requirement
            } else {
              setSelectedCombination(modes[0]);
            }
          }
        } else {
          setErrorMessage(res?.message || 'Invalid class code. Please check and try again.');
        }
      }
    } catch (error) {
      console.error('Failed to join class:', error);
      setErrorMessage(
        error?.message || 'Failed to join class. Please check the class code and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  });  // Get required fields for selected combination
  const getRequiredFields = (combination) => {
    const fields = [];
    if (hasModeFlag(combination, JoinCheckingModeEnum.StudentId)) fields.push('studentId');
    if (hasModeFlag(combination, JoinCheckingModeEnum.StudentName)) fields.push('studentName');
    if (hasModeFlag(combination, JoinCheckingModeEnum.Email)) fields.push('email');
    if (hasModeFlag(combination, JoinCheckingModeEnum.PIN)) fields.push('pin');
    return fields;
  };

  // Get display name for combination
  const getCombinationDisplay = (combination) => {
    const modes = [];
    if (hasModeFlag(combination, JoinCheckingModeEnum.StudentId)) modes.push('Student ID');
    if (hasModeFlag(combination, JoinCheckingModeEnum.StudentName)) modes.push('Student Name');
    if (hasModeFlag(combination, JoinCheckingModeEnum.Email)) modes.push('Email');
    if (hasModeFlag(combination, JoinCheckingModeEnum.PIN)) modes.push('PIN');
    return modes.join(' + ');
  };

  useEffect(() => {
    const fetchClassInfo = async () => {
      const classId = params.get('class');
      console.log('classId from params: ', classId);
      if (classId) {
        try {
          setIsLoading(true);
          setErrorMessage(null);

          // Set the class code in the form
          setValue('classCode', classId);

          const res = await realtimeClassAPI.getClassJoinInfo(classId);

          if (res?.code === 0 && res?.data) {
            setClassInfo(res.data);
            // Check if no verification is required or only one combination exists
            const modes = res.data.joinCheckingModes || [0];
            if (modes.length === 1) {
              // If no verification required (0), set to Student ID (1) as minimum
              if (modes[0] === 0) {
                setSelectedCombination(1); // Force Student ID requirement
              } else {
                setSelectedCombination(modes[0]);
              }
            }
          } else {
            setErrorMessage('Invalid class code. Please check and try again.');
          }
        } catch (error) {
          console.error('Failed to fetch class info:', error);
          setErrorMessage('Failed to load class information. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchClassInfo();
  }, [params, setValue]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '90vh',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ mb: 1 }}>
              {CONFIG.appName}
            </Typography>
            {classInfo ? (
              <Box>
                <Typography variant="h6" color="primary" sx={{ mb: 0.5 }}>
                  {classInfo.courseName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {classInfo.courseCode}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Enter the class code provided by your instructor
              </Typography>
            )}
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          <Form methods={methods} onSubmit={onSubmit}>
            <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
              {!classInfo ? (
                <Field.Text
                  name="classCode"
                  label="Class ID"
                  placeholder="Enter class ID"
                  slotProps={{
                    inputLabel: { shrink: true },
                  }}
                />
              ) : (
                <>
                  {classInfo.joinCheckingModes?.length > 1 && (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 1.5 }}>
                        Choose verification method:
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {classInfo.joinCheckingModes.map((mode, index) => {
                          // Skip displaying option if mode is 0 (no verification)
                          if (mode === 0) return null;
                          return (
                            <Button
                              key={index}
                              variant={selectedCombination === mode ? 'contained' : 'outlined'}
                              onClick={() => setSelectedCombination(mode)}
                              sx={{ justifyContent: 'flex-start' }}
                            >
                              {getCombinationDisplay(mode)}
                            </Button>
                          );
                        })}
                      </Box>
                    </Box>
                  )}

                  {selectedCombination !== null && (
                    <>
                      {hasModeFlag(selectedCombination, JoinCheckingModeEnum.StudentId) && (
                        <Field.Text
                          name="studentId"
                          label="Student ID"
                          placeholder="Enter your student ID"
                          required
                          slotProps={{
                            inputLabel: { shrink: true },
                          }}
                        />
                      )}

                      {hasModeFlag(selectedCombination, JoinCheckingModeEnum.StudentName) && (
                        <Field.Text
                          name="studentName"
                          label="Student Name"
                          placeholder="Enter your full name"
                          required
                          slotProps={{
                            inputLabel: { shrink: true },
                          }}
                        />
                      )}

                      {hasModeFlag(selectedCombination, JoinCheckingModeEnum.Email) && (
                        <Field.Text
                          name="email"
                          label="Email"
                          placeholder="Enter your email"
                          type="email"
                          required
                          slotProps={{
                            inputLabel: { shrink: true },
                          }}
                        />
                      )}

                      {hasModeFlag(selectedCombination, JoinCheckingModeEnum.PIN) && (
                        <Field.Text
                          name="pin"
                          label="PIN"
                          placeholder="Enter your PIN"
                          type="password"
                          required
                          slotProps={{
                            inputLabel: { shrink: true },
                          }}
                        />
                      )}
                    </>
                  )}
                </>
              )}

              <Button
                fullWidth
                color="primary"
                size="large"
                type="submit"
                variant="contained"
                loading={isLoading}
                disabled={isLoading}
              >
                {classInfo ? 'Join Classroom' : 'Continue'}
              </Button>

              {classInfo && (
                <Button
                  fullWidth
                  size="large"
                  variant="outlined"
                  disabled={isLoading}
                  onClick={() => {
                    setClassInfo(null);
                    setSelectedCombination(null);
                    setErrorMessage(null);
                  }}
                >
                  Back
                </Button>
              )}
            </Box>
          </Form>
        </CardContent>
      </Card>
    </Box>
  );
}
