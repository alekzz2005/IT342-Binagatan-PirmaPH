import StandardApiResponse from '../models/StandardApiResponse';

export default class SuccessResponseAdapter {
  adapt(status, payload) {
    const message = this.resolveMessage(payload);
    return StandardApiResponse.success(status, payload, message);
  }

  resolveMessage(payload) {
    if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
      return payload.message;
    }
    if (typeof payload === 'string') {
      return payload;
    }
    return 'Request successful';
  }
}
