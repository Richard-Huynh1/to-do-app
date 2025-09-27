function handler(id) {
  document.querySelector(`[id='${id}'] > .description`).hidden = true;
  document.querySelector(`[id='${id}'] > .rating`).hidden = true;
  document.querySelector(`[id='${id}'] > .rating-ending`).hidden = false;
  document.querySelector(`[id='${id}'] > .edit-task`).hidden = false;
  document.querySelector(`[id='${id}'] > .edit-rating`).hidden = false;
  document.querySelector(`[id='${id}'] > .submit-edits`).hidden = false;
  document.querySelectorAll(`[id='${id}'] > .edit`).forEach(btn => btn.hidden = true);
}

function submitEdits(id) {
  const description = document.querySelector(`[id='${id}'] > .edit-task`).value;
  const rating = document.querySelector(`[id='${id}'] > .edit-rating`).value;
  fetch("http://localhost:3000/edit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: description, rating: rating, id: id }),
  })
  .catch(err => {
    console.log("Error during fetch", err);
  });
  window.location.reload();
}

function deleteTask(id) {
  const params = new URLSearchParams(window.location.search);
  fetch(`http://localhost:3000/tasks?${params}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: id }),
  });
  window.location.reload();
}

function toggleAddTask() {
  const newTask = document.getElementById("add");
  const addBtn = document.querySelector("#to-do-list > button");
  const addBtnImg = document.querySelector("#to-do-list > button > img");
  if (newTask.hidden) {
    newTask.hidden = false;
    addBtn.classList.remove("btn-success");
    addBtn.classList.add("btn-danger");
    addBtnImg.src = "images/minus.png";
  } else {
    newTask.hidden = true;
    addBtn.classList.remove("btn-danger");
    addBtn.classList.add("btn-success");
    addBtnImg.src = "images/plus.svg";
  }
}

function addTask() {
  const description = document.querySelector("#add > span > .edit-task").value;
  const rating = document.querySelector("#add > span > .edit-rating").value;
  const params = new URLSearchParams(window.location.search);
  fetch(`http://localhost:3000/tasks?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json", 
    },
    body: JSON.stringify({ description: description, rating: rating }),
  })
  .catch(err => {
    console.log("Error during fetch", err);
  });
  window.location.reload();
}

function filter(condition) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.set("filter", condition);
  window.location.replace(url.toString());
}
