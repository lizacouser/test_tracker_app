"use strict";

document.addEventListener("DOMContentLoaded", function () {
  let forms = document.querySelectorAll("form.delete, form.complete_all");
  forms.forEach(form => {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (confirm("Are you sure? This cannot be undone!")) {
        event.target.submit();
      }
    });
  });
});


document.addEventListener("DOMContentLoaded", function () {
  let forms = document.querySelectorAll("form#confirm, form.uncheck_all");
  forms.forEach(form => {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (confirm("Are you sure? Marking test as incomplete will clear the score!")) {
        event.target.submit();
      }
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  let forms = document.querySelectorAll("form.remove_tests");
  forms.forEach(form => {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      event.stopPropagation();

      if (confirm("Are you sure? Removing tests will clear the scores!")) {
        event.target.submit();
      }
    });
  });
});