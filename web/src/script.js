import Masonry from 'masonry-layout';
import imagesLoaded from 'imagesloaded';
import 'lazysizes';
import 'lazysizes/plugins/blur-up/ls.blur-up';
import 'lazysizes/plugins/object-fit/ls.object-fit';
import 'lazysizes/plugins/parent-fit/ls.parent-fit';

const snapContainer = document.getElementById('snap-container');
const scrollButton = document.querySelector('.scroll-button');
const main = document.querySelector('main');
const grid = document.getElementById('grid');
const blurImg =
    'https://drive.google.com/uc?export=view&id=1L9QleiNcxQMWdS7M5urFTpz85RTtpJMy';
const masonry = new Masonry(grid, {
    itemSelector: '.grid-item',
    columnWidth: '.grid-sizer',
    percentPosition: true,
});

const itemComponent = function itemComponent(image) {
    const { download_url, height, width, author } = image;
    const item = document.createElement('div');
    item.classList.add('grid-item', 'wrapper');
    const mediabox = document.createElement('div');
    mediabox.classList.add('mediabox');
    item.appendChild(mediabox);
    const img = document.createElement('img');
    img.classList.add('mediabox-img', 'lazyload');
    img.dataset.src = download_url;
    img.dataset.lowsrc = blurImg;
    img.dataset.sizes = 'auto';
    img.width = width;
    img.height = height;
    img.alt = author;
    mediabox.appendChild(img);
    item.appendChild(mediabox);
    return item;
};

fetch('https://picsum.photos/v2/list?limit=30')
    .then((res) => res.json())
    .then((res) => {
        res.forEach((item) => {
            const itemComp = itemComponent(item);
            grid.appendChild(itemComp);
        });
    })
    .then(() => {
        imagesLoaded(grid).on('progress', () => {
            masonry.layout();
        });
    })
    .catch((err) => console.log(err));

snapContainer.onscroll = function onScroll() {
    masonry.layout();
};

scrollButton.onclick = function onClick() {
    main.scrollIntoView({ behavior: 'smooth' });
};
