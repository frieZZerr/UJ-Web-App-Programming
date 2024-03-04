function cancelReservation(reservationId) {
    const uniqueReservationId = prompt("Please enter the unique reservation ID:");
    if (uniqueReservationId !== null && uniqueReservationId !== "") {
        // Send a POST request to cancel the reservation
        fetch(`/cancel-reservation/${reservationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uniqueReservationId: uniqueReservationId })
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Network response was not ok.');
        })
        .then(data => {
            console.log(data);
            alert('Reservation cancelled successfully!');
            // Reload the page to update the list of reservations
            window.location.reload();
        })
        .catch(error => {
            console.error('There was a problem cancelling the reservation:', error.message);
            alert('Failed to cancel reservation.\nMake sure that the reservation cancel ID is correct.');
        });
    }
}
