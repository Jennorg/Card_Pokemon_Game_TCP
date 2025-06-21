function successResponse(res, statusCode, message, data = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function errorResponse(res, statusCode, message, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}

export { successResponse, errorResponse };