function reserveItem(itemId) {
    const userName = prompt("Please enter your name:");
    if (userName !== null && userName !== "") {
        // Send a POST request to reserve the item
        fetch(`/reserve/${itemId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userName: userName })
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            console.log(data);
            alert('Reservation made successfully!\nYour reservationID is '+data.reservationId+'.\nRemember it so you can cancel your reservation if needed.');
            // Reload the page to update the list of available items
            window.location.reload();
        })
        .catch(error => {
            console.error('There was a problem with the reservation:', error.message);
            alert('Failed to make reservation. Please try again later.');
        });
    }
}
