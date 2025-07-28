const mainPage = document.getElementById("mainPage");
const event1 = document.getElementById("event1");
const event2 = document.getElementById("event2");

function showEvent1() {
    mainPage.style.display = "none";
    event1.style.display = "flex";
    event1.style.flexDirection = "column";
}

function showEvent2() {
    mainPage.style.display = "none";
    event2.style.display = "flex";
    event2.style.flexDirection = "column";
}

function showMembers() {
    mainPage.style.display = "none";
    document.getElementById("members-detail").style.display = "flex";
    document.getElementById("members-detail").style.flexDirection = "column";
}

function backToMain() {
    mainPage.style.display = "flex";
    event1.style.display = "none";
    event2.style.display = "none";
    document.getElementById("members-detail").style.display = "none";
}