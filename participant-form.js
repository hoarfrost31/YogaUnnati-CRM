const participantForm = document.getElementById("participantForm");
const participantSuccess = document.getElementById("participantSuccess");
const resetParticipantForm = document.getElementById("resetParticipantForm");

function showSuccessState() {
  participantSuccess.classList.remove("hidden");
  participantSuccess.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideSuccessState() {
  participantSuccess.classList.add("hidden");
}

participantForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  showSuccessState();
});

resetParticipantForm?.addEventListener("click", () => {
  hideSuccessState();
});
