
let httpRequest;

document.getElementById("user1_button").addEventListener("click", handleUser1Button);
document.getElementById("user2_button").addEventListener("click", handleUser2Button);

let inputbtn = document.getElementById("input")
function handleUser1Button() {
//	alert("");
	let name  = inputbtn.innerText;
	//let baseURI = "http://dfghj/courses/profs/alex"
	// httpRequest = new XMLHttpRequest();
	// httpRequest.send( {
	//
	//
	// 	`${baseURI}/${name}`
	// })

}

function containNumOnly(s) {
	for (let i = 0; i < s.length; i++) {
		if (s.charAt(i) < '0' || s.charAt(i) > '9') {
			return false
		}
	}
	return true;
}

function handleUser2Button() {
//	alert("");

	let dept = document.getElementById('course_department').value;
	let id;
	const idValue = document.getElementById('course_id').value;
	if (containNumOnly(idValue)) {
		id = idValue;
	} else {
		console.log("id must be number");
	}
	let year;
	const yearValue = document.getElementById('course_year').value;
	if (containNumOnly(yearValue) && yearValue.length === 4 && parseInt(yearValue) <= 2023 && parseInt(yearValue) >= 1999) {
		year = parseInt(yearValue);
	} else {
		console.log("Year must be a reasonable four digits number");
	}
	let queryTemplate = {
	"WHERE": {
	"AND": [
		{
			"IS": {
				"sections_dept": dept
			}
		},
		{
			"IS": {
				"sections_id": id
			}
		},
		{
			"EQ": {
				"sections_year": year
			}
		},
		{
			"NOT": {
				"IS": {
					"sections_instructor": ""
				}
			}
		}
	]
},
	"OPTIONS": {
	"COLUMNS": [
		"sections_avg",
		"sections_instructor",
		"sections_uuid"
	],
		"ORDER": "sections_avg"
}
}
console.log(queryTemplate);
}
