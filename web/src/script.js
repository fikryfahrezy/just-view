import Isotope from 'isotope-layout';
import 'lazysizes';
import 'lazysizes/plugins/blur-up/ls.blur-up';
import 'lazysizes/plugins/object-fit/ls.object-fit';
import 'lazysizes/plugins/parent-fit/ls.parent-fit';

const blurImg =
    'https://drive.google.com/uc?export=view&id=1L9QleiNcxQMWdS7M5urFTpz85RTtpJMy';
const grid = document.querySelector('.grid');
const scrollButton = document.querySelector('.scroll-button');
let modal = null;

const itemComponent = function itemComponent(image) {
    const { download_url, height, width, author } = image;
    const item = document.createElement('div');
    item.classList.add('grid-item');
    const img = document.createElement('img');
    item.appendChild(img);
    img.classList.add('media-box', 'lazyload');
    img.dataset.sizes = 'auto';
    img.dataset.lowsrc = blurImg;
    img.dataset.src = download_url;
    img.width = width;
    img.height = height;
    img.alt = author;
    item.appendChild(img);

    return item;
};

const modalAnchorComponent = function modalAnchorComponent(
    link = 'https://google.com'
) {
    const anchor = document.createElement('a');
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.href = link;

    return anchor;
};

const modalComponent = function modalComponent(data) {
    const {
        name = 'Place name',
        source = 'Source name',
        source_link = 'https://google.com',
        lat = 47,
        lng = 25,
        url = 'https://picsum.photos/400/800',
    } = data;
    const modalDiv = document.createElement('div');
    modalDiv.classList.add('modal');

    const baseDiv = document.createElement('div');
    modalDiv.appendChild(baseDiv);

    const img = document.createElement('img');
    baseDiv.appendChild(img);
    img.src = url;
    img.alt = name;

    const descDiv = document.createElement('div');
    baseDiv.appendChild(descDiv);

    const placeName = document.createElement('p');
    descDiv.appendChild(placeName);
    placeName.textContent = name;

    const sourceLink = modalAnchorComponent(source_link);
    descDiv.appendChild(sourceLink);

    const sourceName = document.createElement('p');
    sourceLink.appendChild(sourceName);
    sourceName.textContent = source;

    const mapLink = modalAnchorComponent(
        `https://maps.google.com/?q=${lat},${lng}`
    );
    descDiv.appendChild(mapLink);

    const button = document.createElement('button');
    mapLink.appendChild(button);

    const pinIcon = document.createElement('i');
    button.appendChild(pinIcon);
    pinIcon.classList.add('fas', 'fa-map-marker-alt');
    button.append('Map');

    return modalDiv;
};

fetch('https://picsum.photos/v2/list?limit=100')
    .then((res) => res.json())
    .then((res) => {
        res.forEach((item) => {
            const itemComp = itemComponent(item);
            grid.appendChild(itemComp);
        });
    })
    .then(() => {
        new Isotope(grid, {
            itemSelector: '.grid-item',
            percentPosition: true,
            masonry: {
                columnWidth: '.grid-sizer',
            },
        });

        const gridItems = document.querySelectorAll('.grid-item');
        gridItems.forEach((el) => {
            const img = el.querySelector('img');
            img.onclick = function onClick() {
                modal = modalComponent({});
                document.body.appendChild(modal);
                modal.onclick = function onClick() {
                    this.remove();
                };
            };
        });
    })
    .catch((err) => console.log(err));

scrollButton.onclick = function onClick() {
    grid.scrollIntoView({ behavior: 'smooth' });
};
