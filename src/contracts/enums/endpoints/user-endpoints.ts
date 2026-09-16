enum UserEndpoints {
  LIST = '/users',
  CREATE = '/users',
  UPDATE = '/users/{id}',
  RESET_PASSWORD = '/users/{id}/reset-password',
  TOGGLE_STATUS = '/users/{id}/toggle-status',
}

export default UserEndpoints;
