let httpRequest;

document.getElementById("user1_button").addEventListener("Explore a professor's courses", handleUser1Button);
document.getElementById("user2_button").addEventListener("Find out the best professor to take a course with", handleUser2Button);
function handleUser1Button() {
	httpRequest = new XMLHttpRequest();
	httpRequest.open("GET", "/style.css");
	//httpRequest.send();
}

function handleUser2Button() {
	//alert("");
}
