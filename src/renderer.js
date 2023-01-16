const source = document.getElementById('wordGoal');

function handleOnChange({ target: { value }}) {
    API.setGoal(value)
}
source.addEventListener('input', handleOnChange);
 