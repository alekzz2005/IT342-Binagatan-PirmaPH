import StandardApiResponse from '../models/StandardApiResponse';

export default class ErrorResponseAdapter {
  adapt(status, payload, fallbackMessage = 'An error occurred') {
    const message = this.resolveMessage(payload, fallbackMessage);
    return StandardApiResponse.failure(status, message, payload);
  }

  resolveMessage(payload, fallbackMessage) {
    if (payload && typeof payload === 'object') {
      if (typeof payload.message === 'string') {
        return payload.message;
      }
      if (typeof payload.error === 'string') {
        return payload.error;
      }
    }

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    return fallbackMessage;
  }
}
