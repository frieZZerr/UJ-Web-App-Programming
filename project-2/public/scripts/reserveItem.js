function reserveItem() {
    const itemId = window.location.pathname.split('/').pop();
    const username = document.getElementById('username').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!username) {
        alert('Please enter your username.');
        return;
    }

    if (!startDate || !endDate) {
        alert('Please select both start and end dates.');
        return;
    }

    // Perform validation for start and end dates
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    if (startDateObj >= endDateObj) {
        alert('End date must be after start date.');
        return;
    }

    const currentDate = new Date(); // Current date and time
    currentDate.setMinutes(currentDate.getMinutes() - 1);
    if ( startDateObj < currentDate) {
        alert('Start date must be from now or the future.');
        return;
    }

    // Send a POST request to reserve the item
    fetch(`/reserve/${itemId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userName: username,
            reservationStartDate: startDate,
            reservationEndDate: endDate
        })
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else if (response.status === 400) {
            return response.json().then(data => {
                throw new Error(data.error);
            });
        }
        throw new Error('Failed to reserve item.');
    })
    .then(data => {
        console.log(data);
        alert('Reservation made successfully!\nYour reservationID is '+data.reservationId+'.\nRemember it so you can cancel your reservation if needed.');
        window.location.href = '/reservations'; // Redirect to reservations after reservation
    })
    .catch(error => {
        console.error('Error reserving item:', error.message);
        alert(error.message);
    });
}
