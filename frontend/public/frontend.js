
document.getElementById("user1_button").addEventListener("click", handleUser1Button);
document.getElementById("user2_button").addEventListener("click", handleUser2Button);
document.getElementById("prof_fName").addEventListener("click", changeBackMsg);
document.getElementById("prof_lName").addEventListener("click", changeBackMsg);

document.getElementById("course_department").addEventListener("click", changeBackMsg2);
document.getElementById("course_id").addEventListener("click", changeBackMsg2);
document.getElementById("course_year").addEventListener("click", changeBackMsg2);


function handleUser1Button() {
    //alert("");
	document.getElementById("output").innerHTML = "";
	let fName = document.getElementById("prof_fName").value.trim().toLowerCase();
	let lName = document.getElementById("prof_lName").value.trim().toLowerCase();

	console.log(fName + lName);
	let msg = document.getElementById("message1");
	if(fName === "" || lName === ""){
		msg.innerText = "Prof name cannot be empty";
		msg.style.color = "red";
	}else{
		let url = "/query/" + fName+"/" + lName;

		try{
			fetch(url, {method:"GET"})
				.then(response => response.text())
				.then((text) => {
					 let res = JSON.parse(text).result;
					if(res.length === 0){
						msg.innerText = "No record found, please check your spelling";
					}else{
						for(let i=0; i<res.length; i++){
							let str = res[i].sections_dept + res[i].sections_id + ": " + res[i].sections_title;
							document.getElementById("output").insertRow().innerText = str;
						}
					}
				})
			.catch(error => {
				console.log(error);
				msg.innerText = "Unexpected error happened: " + String(error);
			});
		}catch(err){
			console.log(err);
			msg.innerText = "Unexpected error happened: " + String(err);
		}

	}
}

function containNumOnly(s) {
	for (let i = 0; i < s.length; i++) {
		if (s.charAt(i) < '0' || s.charAt(i) > '9') {
			return false
		}
	}
	return true;
}
function changeBackMsg(){
	let msg = document.getElementById("message1");
	msg.innerText = "Please input the first name and last name of a professor";
	msg.style.color = "black";
}


function changeBackMsg2(){
	let msg = document.getElementById("message2");
	msg.innerText = "Please input course department, id and year";
	msg.style.color = "black";
}


function handleUser2Button() {
    //alert("");
	let msg = document.getElementById("message2");
	document.getElementById("output2").innerHTML = "";
	let dept = document.getElementById('course_department').value;
	let id;
	const idValue = document.getElementById('course_id').value;
	if (containNumOnly(idValue)) {
		id = idValue;
	} else {
		msg.innerText = "Please input the valid id";
		msg.style.color="red";
		return;
	}
	let year;
	const yearValue = document.getElementById('course_year').value;
	if (containNumOnly(yearValue) && yearValue.length === 4 && parseInt(yearValue) <= 2023 && parseInt(yearValue) >= 1999) {
		year = parseInt(yearValue);
	} else {
		msg.innerText = "Please input the valid year";
		msg.style.color="red";
		return;
	}
	let url = "/queryForBestProf/" + dept+"/" + id+"/" + year;
	try{
		fetch(url, {method:"GET"})
			.then(response => response.text())
			.then((text) => {
				let res = JSON.parse(text).result;
				if(res.length === 0){
					msg.innerText = "No record found, please check your spelling";
				}else{
					for(let i=0; i<res.length; i++){
						let str = res[i].sections_avg + "	" + res[i].sections_instructor + ":  " + res[i].sections_uuid;
						document.getElementById("output2").insertRow().innerText = str;
					}
				}
			})
			.catch(error => {
				console.log(error);
				msg.innerText = "Unexpected error happened: " + String(error);
				msg.style.color = "red";
			});
	}catch(err){
		console.log(err);
		msg.innerText = "Unexpected error happened: " + String(err);
		msg.style.color = "red";
	}

//console.log(queryTemplate);
}
