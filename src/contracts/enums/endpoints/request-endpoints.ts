enum RequestEndpoints {
  LIST = '/requests',
  LIST_PENDING = '/requests/pending',
  CREATE = '/requests',
  APPROVE = '/requests/{id}/approve',
  DENY = '/requests/{id}/deny',
}

export default RequestEndpoints;
