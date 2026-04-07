export default class StandardApiResponse {
  constructor({ success, status, data = null, message = '', error = null }) {
    this.success = success;
    this.status = status;
    this.data = data;
    this.message = message;
    this.error = error;
  }

  static success(status, data, message = 'Request successful') {
    return new StandardApiResponse({
      success: true,
      status,
      data,
      message,
      error: null,
    });
  }

  static failure(status, message, details = null) {
    return new StandardApiResponse({
      success: false,
      status,
      data: null,
      message,
      error: details,
    });
  }
}
