const API_KEY_V3 = "8e30f1d6b85b953190e2860ec2de2c29";
const MOVIES_BASE_URL = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY_V3}`;
const MOVIES_BY_ID_BASE_URL = `https://api.themoviedb.org/3/movie`
const SMALL_IMAGES_BASE_URL = "http://image.tmdb.org/t/p/w45";
const BIG_IMAGES_BASE_URL = "http://image.tmdb.org/t/p/w185";
const BACKUP_IMAGE =  "./404.png";

const listElementsToCreate = [
    {
        "tag":"div",
        "class":"suggestionContainer"
    },
    {
        "tag":"img",
        "class":"suggestionPicture"
    },
    {
        "tag":"div",
        "class":"infoContainer"
    },
    {
        "tag":"div",
        "class":"titleContainer"
    },
    {
        "tag":"div",
        "class":"dateContainer"
    }
]


class Node {
    constructor(value) {
        this.value = value;
        this.nextNode = null;
        this.prevNode = null;
    }
}

class DLL {
    constructor() {
        this.tail = null;
        this.head = null;
        this.length = 0;
    }

    * returnFirstMNodes(numberOfNodes) {
        let currentNode = this.head;
        let i = 0;
        while (currentNode != null && i < numberOfNodes) {
            yield currentNode;
            currentNode = currentNode.nextNode;
            i++;
        }
    }

    appendToStart(node) {
        if (this.head == null) {
            this.appendFirstNode(node);
        } else {
            node.nextNode = this.head;
            this.head = node;
            this.length++;
        }
    }

    appendFirstNode(node) {
        this.head = this.tail = node;
        this.length++;
    }

    prepareForJSONification() {
        let newDll = new DLL();
        let nodes = [...this.returnFirstMNodes(this.length)]
        nodes.map(node => new Node(node.value))
            .forEach(newNode => newDll.appendToStart(newNode));
        return newDll;
    }

    recreateFromLocalStorage(dataFromLocalStorage) {
        let currentNode  = dataFromLocalStorage.head;
        while (currentNode != null) {
            this.addLatestFilm(new Node(currentNode.value))
            currentNode = currentNode.nextNode;
        }
        return this
    }

    addLatestFilm(node) {
        if (this.head == null) {
            this.appendFirstNode(node);
        } else {
            if (!this.duplicateInFirstFiveNodes(node)) {
                this.head.prevNode = node;
                node.nextNode = this.head;
                this.head = node;
                this.length >= 100 ? this.removePenultimateNode() : this.length++;
            }
        }
    }

    removePenultimateNode() {
        let penultimateNode = this.tail.prevNode;
        penultimateNode.nextNode = null;
        this.tail = penultimateNode;
    }

    duplicateInFirstFiveNodes(node) {
        let filteredNodes = [...this.returnFirstMNodes(5)]
            .filter(storedNode => storedNode.value.id == node.value.id);
        if (filteredNodes.length > 0) {
            this.shiftNodeToHead(filteredNodes[0]);
            return true;
        }
        return false;
    }

    shiftNodeToHead(node) {
        if (node != this.head) {
            if (node == this.tail) {
                this.shiftLastNodeToHead();
            } else {
                this.pullNodeOut(node);
                this.pushNodeToStart(node);
            }
        }
    }

    pullNodeOut(node) {
        node.prevNode.nextNode = node.nextNode;
        node.nextNode.prevNode = node.prevNode;
    }

    pushNodeToStart(node) {
        node.prevNode = null;
        node.nextNode = this.head;
        this.head.prevNode = node;
        this.head = node;
    }

    shiftLastNodeToHead() {
        let tailNode = this.tail;
        tailNode.prevNode.nextNode = null;
        this.tail = tailNode.prevNode;
        this.pushNodeToStart(tailNode);
    }


}

class SPA {
    
    constructor() {
        this.input = document.getElementById("searchInput");
        this.searchList = document.getElementById("searchList");
        this.selectedFilmConatiner = document.getElementById("resultDiv");
        this.resultImgDiv = document.getElementById("resultImg");
        this.latestDiv = document.getElementById("latestDiv");
        this.dll = new DLL();
    }

    subscribeToLocalStorage() {
        window.addEventListener("storage", () => {
            const localData = localStorage.getItem('dll');
            if (localData != null) {
                this.dll.recreateFromLocalStorage(JSON.parse(localData));
                this.addThreeLatestFilms();
            }  
        });
    }

    addInputFucntionality() {
        this.input.oninput = () => {
            if (this.input.value === "") {
                this.showFiveRecentlySearchedFilms();
            } else {
                fetch(MOVIES_BASE_URL+`&query=${this.input.value}`)
                    .then(response => response.json())
                        .then(data => this.processResponseData(data))
                            .catch(error => console.log(error));
            }
        }
        this.input.onfocus = () => {
            if (this.input.value === "") {
                this.showFiveRecentlySearchedFilms();
            }
        }
    }

    showFiveRecentlySearchedFilms() {
        ContentCreator.clearElement(this.searchList);
        let mostRecentFilms = this.getMostRecentlySearchedFilms();
        mostRecentFilms.forEach(film => this.searchList.appendChild(film));
    }

    getMostRecentlySearchedFilms() {
        return [...this.dll.returnFirstMNodes(5)]
            .filter(node => node.value.original_title.toLowerCase().startsWith(this.input.value.toLowerCase()))
                .map(node => ContentCreator.createNewListElement(node.value))
                    .map(htmlElement => {
                        htmlElement.onclick = () => this.showFullFilmInfo(htmlElement.id);
                        return htmlElement;
                    })
    }
    
    prepareInitialData() {
        this.subscribeToLocalStorage();
        const localData = localStorage.getItem('dll');
        if (localData != null) {
            this.dll.recreateFromLocalStorage(JSON.parse(localData));
            this.addFilmOnPage(this.dll.head.value);
            this.addThreeLatestFilms();
        }  
    }

    addThreeLatestFilms() {
        ContentCreator.clearElement(this.latestDiv);
        if (this.dll.length > 3) {
            this.addMLatestFilms(3);
        } else {
            this.addMLatestFilms(this.dll.length)
        }
    }

    addMLatestFilms(numOfFilms) {
        let currentNode = this.dll.head;
        for (let i = 0; i < numOfFilms; i++) {
            const latest = ContentCreator.createNewListElement(currentNode.value);
            latest.onclick = () => this.showFullFilmInfo(latest.id);
            latestDiv.appendChild(latest);
            currentNode = currentNode.nextNode;
        }
    }
    
    processResponseData(data) {
        ContentCreator.clearElement(this.searchList);
        let tenSuggestedFilms = this.filterResponseData(data);
        ContentCreator.appendChildren(this.searchList, tenSuggestedFilms);
    }

    filterResponseData(data) {
        let mostRecentFilms = this.getMostRecentlySearchedFilms();
        let mostRecentFilmsIds = mostRecentFilms.map(film => parseInt(film.id));
        let filteredResponseFilms = data.results.slice(0, 10)
                .filter(film => !mostRecentFilmsIds.includes(film.id))    
                    .map(film => ContentCreator.createNewListElement(film))
                        .map(htmlElement => {
                            htmlElement.onclick = () => this.showFullFilmInfo(htmlElement.id);
                            return htmlElement
                        });
        return [...mostRecentFilms, ...filteredResponseFilms.slice(0, 10 - mostRecentFilms.length)]
    }
    
    showFullFilmInfo(id) {
        if (this.selectedFilmConatiner.name != id) {
            fetch(MOVIES_BY_ID_BASE_URL+`/${id}?api_key=${API_KEY_V3}`)
                .then(response => response.json())
                    .then(data => this.addFilmOnPageOnClick(data))
                        .catch(error => console.log(error));
        }
    }
    
    addFilmOnPageOnClick(data) {
        if (this.selectedFilmConatiner.name != data.id) {
            StorageHandler.addNodeToDLL(this.dll, data);
            this.addFilmOnPage(data);
            this.addThreeLatestFilms();
        }
    }

    addFilmOnPage(data) {
        this.selectedFilmConatiner.name = data.id;
        this.prepareResultImage(data);
        Array.from(this.selectedFilmConatiner.children)
            .filter(child => child.id != "resultImg")
                .forEach(child => child.innerHTML = data[child.id]);
    }

    prepareResultImage(data) {
        ContentCreator.clearElement(this.resultImgDiv)
        let resultImg = ContentCreator.createSingleElementWithClass('img','resultImg');
        ContentCreator.setImage(resultImg, BIG_IMAGES_BASE_URL + data.poster_path);
        this.resultImgDiv.appendChild(resultImg);
        this.selectedFilmConatiner.classList.remove("hidden");
    }

}

class ContentCreator {

    static createNewListElement(entry) {
        const [upperDiv, logoImg, infoDiv, titleDiv, dateDiv] = this.createElementsWithClass(listElementsToCreate);
        this.setImage(logoImg, SMALL_IMAGES_BASE_URL + entry.poster_path);
        this.setInnerHtml(titleDiv, entry.original_title);
        this.setInnerHtml(dateDiv, entry.release_date);
        this.appendChildren(infoDiv, [titleDiv, dateDiv]);
        this.appendChildren(upperDiv, [logoImg, infoDiv]);
        upperDiv.id = entry.id;
        return upperDiv;
    }
    
    static createElementsWithClass = (elementsArray) => {
        return elementsArray.map(
            element => this.createSingleElementWithClass(element.tag, element.class)
        )
    }
    
    static createSingleElementWithClass = (element, className) => {
        let newElement = document.createElement(element);
        newElement.className = className;
        return newElement;
    }

    static setImage = (img, imgSrc) => {
        if (imgSrc == null) {
            img.src = BACKUP_IMAGE;
        } else {
            img.src = imgSrc;
            img.onerror = () => {
                img.src = BACKUP_IMAGE;
            }
        }
    }
    
    static setInnerHtml = (element, html) => {
        element.innerHTML = html;
    }
    
    static appendChildren = (parent, children) => {
        children.forEach(
            child => parent.appendChild(child)
        )
    }

    static clearElement(element) {
        element.innerHTML = "";
    }

}


class StorageHandler {

    static addNodeToDLL(dll, data) {
        const node = new Node(data);
        dll.addLatestFilm(node);
        try {
            localStorage.setItem('dll', JSON.stringify(dll.prepareForJSONification()));
        } catch (e) {
            console.log("Local storage error", e);
        } 
    }

}


let spa = new SPA();
spa.prepareInitialData();
spa.addInputFucntionality();