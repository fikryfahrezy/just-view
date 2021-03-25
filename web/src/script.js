import imagesLoaded from 'imagesloaded';

console.log('hi');

const main = document.getElementById('main');

// https://medium.com/@andybarefoot/a-masonry-style-layout-using-css-grid-8c663d355ebb
function resizeGridItem(item) {
    const rowHeight = parseInt(
        window.getComputedStyle(main).getPropertyValue('grid-auto-rows'),
        10
    );
    const rowGap = parseInt(
        window.getComputedStyle(main).getPropertyValue('grid-row-gap'),
        10
    );
    const rowSpan = Math.ceil(
        (item.querySelector('.content').getBoundingClientRect().height +
            rowGap) /
            (rowHeight + rowGap)
    );
    item.style.gridRowEnd = 'span ' + rowSpan;
}

function resizeInstance(instance) {
    const item = instance.elements[0];
    resizeGridItem(item);
}

function itemComponent(imageUrl) {
    const item = document.createElement('div');
    item.classList.add('item');
    const content = document.createElement('div');
    content.classList.add('content');
    item.appendChild(content);
    const img = document.createElement('img');
    img.classList.add('photothumb');
    img.src = imageUrl;
    img.alt = 'View Image';
    content.appendChild(img);
    return item;
}

fetch('https://picsum.photos/v2/list?limit=100')
    .then((res) => res.json())
    .then((res) =>
        res.forEach((item) => {
            const itemComp = itemComponent(item.download_url);
            main.appendChild(itemComp);
            resizeGridItem(itemComp);
            imagesLoaded(itemComp, resizeInstance);
        })
    )
    .catch((err) => console.log(err));
