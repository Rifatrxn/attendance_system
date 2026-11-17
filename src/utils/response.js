class ResponseUtil {
  static success(res, message, data = null, statusCode = 200) {
    const response = {
      success: true,
      message: message
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  static error(res, message, statusCode = 500) {
    const response = {
      success: false,
      message: message
    };

    return res.status(statusCode).json(response);
  }
}

module.exports = ResponseUtil;

