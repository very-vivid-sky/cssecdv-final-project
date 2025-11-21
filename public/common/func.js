document.addEventListener('DOMContentLoaded', () => {
	
    var reqbtn = document.getElementById('reqbtn');
    
    //This connects the onclick event
    reqbtn.on = () => {
        //The Fetch API is a built in and more modern method of handling
        //asynchronous HTTP requests. Read more:
        //https://www.w3schools.com/js/js_api_fetch.asp
    
        fetch(
            /* This is the way to create templates with strings */
            `server_ajax/${textinput.value}`,{ 
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            //If a post request is made, the content would be submitted
            //as a JSon array in the form of a string.
            //body: JSON.stringify({ input: textinput.value })
        }).then((response) => { //This promise is made to check the response status
        
            if(response.ok) return response.json();
            return Promise.reject(response);
        }).then((data) => { //This promise is made to process the callback
            const newItem = document.createElement('div');
            newItem.innerText = document.getElementById('textinput').value+":"+data.sound;
            document.getElementById('contentbody').appendChild(newItem);
        }).catch((error) => {
            alert(error);
            render();
        });
    };//onclick
    
    });//addEventListener
    