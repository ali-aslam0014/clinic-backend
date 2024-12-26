// ... existing error cases ...

if (err.name === 'ValidationError' && err.errors?.reminderTime) {
  const message = 'Invalid reminder time selected';
  error = new ErrorResponse(message, 400);
}

// ... rest of the file ...