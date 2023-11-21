import React,{useState,useEffect} from 'react'


let httpRequest;

document.getElementById("user1_button").addEventListener("click", handleUser1Button);
document.getElementById("user2_button").addEventListener("click", handleUser2Button);

let inputbtn = document.getElementById("input")
function handleUser1Button() {
	let name  = inputbtn.innerText;
	//let baseURI = "http://dfghj/courses/profs/alex"
	// httpRequest = new XMLHttpRequest();
	// httpRequest.send( {
	//
	//
	// 	`${baseURI}/${name}`
	// })

}



function handleUser2Button() {
	//alert("");
}
