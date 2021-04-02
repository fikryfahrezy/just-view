const grid = document.getElementById('grid');

function itemComponent(imageUrl) {
    const item = document.createElement('div');
    item.classList.add('grid-item');
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'View Image';
    item.appendChild(img);
    return item;
}

fetch('https://picsum.photos/v2/list?limit=100')
    .then((res) => res.json())
    .then((res) => {
        res.forEach((item) => {
            const itemComp = itemComponent(item.download_url);
            grid.appendChild(itemComp);
        });
    })
    .then(() => {
        imagesLoaded(grid, () => {
            new Masonry(main, {
                itemSelector: '.grid-item',
                columnWidth: '.grid-sizer',
                percentPosition: true,
            });
        });
    })
    .catch((err) => console.log(err));
