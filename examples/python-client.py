import requests
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class QuoteRequest:
    collection_suburb: str
    collection_postcode: str
    delivery_suburb: str
    delivery_postcode: str
    weight: float
    length: float
    width: float
    height: float
    service_type: Optional[str] = None


@dataclass
class Address:
    name: str
    address: str
    suburb: str
    postcode: str
    country: str
    phone: str
    email: str


@dataclass
class Package:
    weight: float
    length: float
    width: float
    height: float
    description: Optional[str] = None


class NSJExpressClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    def get_quote(self, request: QuoteRequest) -> Dict:
        payload = {
            'collectionSuburb': request.collection_suburb,
            'collectionPostcode': request.collection_postcode,
            'deliverySuburb': request.delivery_suburb,
            'deliveryPostcode': request.delivery_postcode,
            'weight': request.weight,
            'length': request.length,
            'width': request.width,
            'height': request.height,
        }

        if request.service_type:
            payload['serviceType'] = request.service_type

        return self._request('POST', '/functions/v1/api-quote', json=payload)

    def create_booking(
        self,
        quote_id: str,
        shipper: Address,
        consignee: Address,
        packages: List[Package],
        reference: Optional[str] = None
    ) -> Dict:
        payload = {
            'quoteId': quote_id,
            'shipper': {
                'name': shipper.name,
                'address': shipper.address,
                'suburb': shipper.suburb,
                'postcode': shipper.postcode,
                'country': shipper.country,
                'phone': shipper.phone,
                'email': shipper.email,
            },
            'consignee': {
                'name': consignee.name,
                'address': consignee.address,
                'suburb': consignee.suburb,
                'postcode': consignee.postcode,
                'country': consignee.country,
                'phone': consignee.phone,
                'email': consignee.email,
            },
            'packages': [
                {
                    'weight': pkg.weight,
                    'length': pkg.length,
                    'width': pkg.width,
                    'height': pkg.height,
                    'description': pkg.description,
                }
                for pkg in packages
            ],
        }

        if reference:
            payload['reference'] = reference

        return self._request('POST', '/functions/v1/api-book', json=payload)

    def track_shipment(self, consignment_number: str) -> Dict:
        return self._request(
            'GET',
            f'/functions/v1/api-track/{consignment_number}'
        )


def example():
    client = NSJExpressClient(
        base_url='https://your-project.supabase.co',
        api_key='nsjx_your_api_key'
    )

    quote_request = QuoteRequest(
        collection_suburb='Sydney',
        collection_postcode='2000',
        delivery_suburb='Melbourne',
        delivery_postcode='3000',
        weight=5.0,
        length=40.0,
        width=30.0,
        height=20.0,
    )

    quote = client.get_quote(quote_request)
    print('Quote received:', quote)
    print(f"Total cost: ${quote['totalCost']} {quote['currency']}")

    shipper = Address(
        name='John Smith',
        address='123 Business St',
        suburb='Sydney',
        postcode='2000',
        country='AU',
        phone='+61400000000',
        email='john@example.com',
    )

    consignee = Address(
        name='Jane Doe',
        address='456 Customer Ave',
        suburb='Melbourne',
        postcode='3000',
        country='AU',
        phone='+61411111111',
        email='jane@example.com',
    )

    packages = [
        Package(
            weight=5.0,
            length=40.0,
            width=30.0,
            height=20.0,
            description='Electronics',
        )
    ]

    booking = client.create_booking(
        quote_id=quote['quoteId'],
        shipper=shipper,
        consignee=consignee,
        packages=packages,
        reference='ORDER-12345',
    )

    print('Booking created:', booking)
    print(f"Consignment number: {booking['consignmentNumber']}")
    print(f"Label URL: {booking['labelUrl']}")

    tracking = client.track_shipment(booking['consignmentNumber'])
    print('Tracking info:', tracking)
    print(f"Current status: {tracking['status']}")


if __name__ == '__main__':
    example()
