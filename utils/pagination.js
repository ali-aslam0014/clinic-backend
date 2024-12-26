const getPagination = (page, limit, total) => {
  const pagination = {
    current: page,
    pageSize: limit,
    total,
    pages: Math.ceil(total / limit)
  };

  if (page > 1) {
    pagination.prev = page - 1;
  }

  if (page < pagination.pages) {
    pagination.next = page + 1;
  }

  return pagination;
};

module.exports = getPagination; 